//--- DEVELOPER SETTINGS
var CONTENT_SYSTEM_ENABLED = true /*!(getUrlParameter('content_system') === undefined)*/;
var CRITICAL_PATH_ENABLED = !(getUrlParameter('critical_path') === undefined);

//--- Some Methods
function convertToDate(date, start) {
    var dateParts = date.match(/(\d+)\.(\d+)\.(\d+)/);
    return new Date(parseInt(dateParts[3]), parseInt(dateParts[2]) - 1, parseInt(dateParts[1]), (start ? 0 : 23), (start ? 0 : 59), (start ? 0 : 59), (start ? 0 : 999)).getTime();
}

function convertContentToContainer(containerID) {
    return containerID.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');
}

/**
 * http://stackoverflow.com/a/21903119
 */
function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};

function getColor(index) {
    return legendColors[index % legendColors.length];
}

//--- We are storing this to display the first graph when everything else is done and the
// page is ready to be shown.
var firstGraphToDraw = null;
var drawFirst = false;

//--- Map to store the details
var detailMap = [];

//--- Color array
var legendColors = [];

//--- Draw Schedules
$(document).ready(function () {

    //--- Hide menue & disclaimer
    $('#schedules').hide();
    $('.disclaimer').hide();

    //--- Load all details
    $.getJSON('assets/data/details.json', { _: new Date().getTime() }, function (details) {

        $.each(details, function (k, detail) {

            detailMap[detail.id] = detail;

        });

    });

    //--- Load & Draw All Schedules
    $.getJSON('assets/data/index.json', { _: new Date().getTime() }, function (entries) {
        
        //--- Colors
        $.each(entries.legend, function (k, color) { legendColors.push(color); });

        //--- Schedules
        $.each(entries.schedules, function (k, index) {

            //--- Create content id
            var contentID = convertContentToContainer(index.name);
            var containerID = contentID + '-graph';

            if (firstGraphToDraw === null) firstGraphToDraw = containerID;

            //--- Append menue & tab
            $('#schedules').append('<li><a href="#" id="' + contentID + '">' + index.name + '</a></li>');
            $('.containers').append('<div class="container" id="' + containerID + '"></div>')

            //--- Draw schedule
            if (k === entries.schedules.length - 1) {
                //--- Loading done when we arrived at the last schedule
                drawFirst = true;
            }

            drawSchedule(index.files[0] /*TODO*/, index.name, containerID, CRITICAL_PATH_ENABLED, (entries.schedules.length > 1));

        });

        //--- Hide & Seek
        $('#containers > div').each(function () {
            $(this).hide();
        });
    });

});

function drawSchedule(file, title, containerID, criticalPath, ignoreFirst) {

    var xhr = $.ajax({
        url: ('assets/data/schedules/' + file + "?" + new Date().getTime()),
        type: 'GET',
        dataType: 'json',
        success: function (data) {

            //--- Update title
            title += ' (Updated: ' + xhr.getResponseHeader("Last-Modified") + ')'

            //---
            //--- Array to store the data
            var seriesData = [];
            var highlights = [];

            //--- Min & Max to scale x-axis correctly
            var minDate = Number.MAX_SAFE_INTEGER;
            var maxDate = Number.MIN_SAFE_INTEGER;

            //--- Overall progress
            var projectProgress = [];

            //--- Data
            var dataEntry = null;

            //--- Parse the Data
            $.each(data, function (index, value) {

                if (value.title === '__DATA__') {
                    dataEntry = value;
                    return;
                }

                //--- Data Building for our default Gantt Diagramm
                var tmp = {
                    name: value.title,
                    color: getColor(index),
                    data: []
                };

                //--- Overall sub task progress
                var overallDone = 0;
                var weight = 0;
                $.each(value.children, function (k, v) {
                    $.each(v, function (k, v) {
                        weight += moment(convertToDate(v.end, false)).diff(convertToDate(v.start, true));
                    })
                });

                //--- Local min & max
                var localMinDate = Number.MAX_SAFE_INTEGER;
                var localMaxDate = Number.MIN_SAFE_INTEGER;

                //--- Append all Children
                $.each(value.children, function (k, v) {
                    var dependencyId = null;
                    $.each(v, function (k, v) {

                        //--- Converting start & end point to Date
                        var s = convertToDate(v.start, true), e = convertToDate(v.end, false);

                        //--- Check for error
                        if (e < s) {
                            console.error('The child\'s end date is before its start date. The child ID is "' + v.title + '" (' + file + ')');
                        }

                        //--- Find local max & min date
                        localMinDate = Math.min(localMinDate, s);
                        localMaxDate = Math.max(localMaxDate, e);

                        //--- How much is overall done by multipling it with its according weight.
                        overallDone += Math.max(0, Math.min(1, moment().diff(s) / moment(e).diff(s))) * (moment(e).diff(s) / weight);

                        //--- Add data
                        tmp.data.push({
                            taskName: v.title,
                            id: v.title,
                            start: s,
                            end: e,
                            parent: value.title,
                            dependency: dependencyId,
                            detailID: v.detailID,
                            color: getColor(index)
                        });

                        if (!(v.detailID === undefined) && detailMap[v.detailID] === undefined) {
                            console.error("Content System: The child with the ID \"" + v.title + "\" (" + file + ") uses the detail \"" + v.detailID + "\" which does not exist.");
                        }

                        //--- Only store if we wanna draw the critical path, otherwise
                        // we can just ignore it
                        if (criticalPath) {
                            dependencyId = v.title;
                        }
                    });

                });

                //--- Track total project progress
                projectProgress.push({
                    progress: overallDone,
                    weight: weight
                });

                //--- Create parent & active highlighting
                highlights.push(value.title);
                tmp.data.unshift({
                    taskName: value.title,
                    id: value.title,
                    start: localMinDate,
                    end: localMaxDate,
                    completed: {
                        amount: parseFloat(overallDone.toFixed(4)),
                        fill: '#40e6f0'
                    },
                    detailID: value.detailID
                });


                //--- Find Start And End Of Schedule
                minDate = Math.min(minDate, localMinDate);
                maxDate = Math.max(maxDate, localMaxDate);

                //--- Push Final Data
                seriesData.push(tmp);

            });

            //--- Calculate project progress
            var projectTotalWeight = 0;
            var projectTotalProgress = 0;
            $.each(projectProgress, function (k, entry) {
                projectTotalWeight += entry.weight;
            });
            $.each(projectProgress, function (k, entry) {
                projectTotalProgress += (entry.weight / projectTotalWeight * entry.progress);
            });

            //--- Main Entry with some data
            var mainEntry = {
                name: title,
                data: [
                    {
                        id: title,
                        taskName: title,
                        start: minDate,
                        end: maxDate,
                        completed: {
                            amount: parseFloat(projectTotalProgress.toFixed(4)),
                        }
                    }
                ]
            };

            if (!(dataEntry === undefined)) {
                if (!(dataEntry.evocati === undefined)) {
                    mainEntry.data.push({
                        parent: title,
                        taskName: 'Evocati - Release Date',
                        start: convertToDate(dataEntry.evocati, true),
                        parent: title,
                        milestone: true
                    });

                    maxDate = Math.max(convertToDate(dataEntry.evocati, false), maxDate);
                }
                if (!(dataEntry.ptu === undefined)) {
                    mainEntry.data.push({
                        parent: title,
                        taskName: 'PTU - Release Date',
                        start: convertToDate(dataEntry.ptu, true),
                        parent: title,
                        milestone: true,
                    });

                    maxDate = Math.max(convertToDate(dataEntry.ptu, false), maxDate);
                }
                if (!(dataEntry.public === undefined)) {
                    mainEntry.data.push({
                        parent: title,
                        taskName: 'Public - Release Date',
                        start: convertToDate(dataEntry.public, true),
                        parent: title,
                        milestone: true
                    });

                    maxDate = Math.max(convertToDate(dataEntry.public, false), maxDate);
                }
            }

            highlights.push(title);
            seriesData.unshift(mainEntry);

            //--- Some settings
            var ignoreFirstLoad = ignoreFirst;
            var fontColor = '#3FC9E1';

            Highcharts.ganttChart(containerID, {
                series: seriesData,
                chart: {
                    backgroundColor: 'rgba(255, 255, 255, 0)',
                    style: {
                        fontFamily: 'Electrolize',
                        color: fontColor
                    },
                    events: {
                        load: function (event) {
                            //--- Ignore the first load, because this gets fired eventhough it didn't finish loading yet
                            if (ignoreFirstLoad) {
                                ignoreFirstLoad = false;
                                return;
                            }

                            //--- We only wanna kick this in once and ignore all other graphs.
                            if (drawFirst) {
                                $('#loading').hide();

                                $('#schedules').fadeIn('slow');
                                $('#' + firstGraphToDraw).fadeIn('slow');
                                $('.disclaimer').fadeIn('slow');
                                drawFirst = false;
                            }
                        }
                    }
                },
                title: {
                    text: title,
                    style: {
                        color: fontColor
                    }
                },
                xAxis: {
                    currentDateIndicator: true,
                    min: minDate,
                    max: maxDate,
                    labels: {
                        style: {
                            color: fontColor
                        }
                    }
                },
                yAxis: {
                    labels: {
                        style: {
                            color: fontColor
                        },
                        formatter: function () {
                            if (highlights.includes(this.value)) {
                                return '<b>' + this.value + '</b>';
                            }
                            return this.value;
                        }
                    }
                },
                legend: {
                    itemStyle: {
                        color: fontColor
                    },
                    itemHoverStyle: {
                        color: '#C3F2FF',
                        'text-shadow': '0 0 46px rgba(13, 71, 203, 0.57), 0 0 13px rgba(0, 112, 202, 0.75);'
                    }
                },
                credits: {
                    enabled: true
                },
                tooltip: {
                    enabled: true,
                    useHTML: true,
                    formatter: function () {

                        var tooltipContent = '<div class="info-box-title"><b>' + this.key + '</b> | <i>' + moment(this.point.start).format('MMMM Do, YYYY');

                        if (this.point.parent == title) {
                            return tooltipContent;
                        }

                        tooltipContent += ' - ' + moment(this.point.end).format('MMMM Do, YYYY') + '</i></div>';

                        if (!(this.point.detailID === undefined) && CONTENT_SYSTEM_ENABLED) {

                            var detail = detailMap[this.point.detailID];

                            if ((!(detail.enabled === undefined) && detail.enabled === true) || detail.enabled === undefined) {
                                var firstContentAdd = true;
                                tooltipContent += '<div class="info-box-content"><hr />';

                                $.each(detail.content, function (k, value) {
                                    tooltipContent += (firstContentAdd || detail.sections ? '' : '<br />') + value.data;

                                    if (detail.sections === true && !(k === detail.content.length - 1)) {
                                        tooltipContent += '<hr />';
                                    }

                                    firstContentAdd = false;
                                });

                                tooltipContent += '</div>';
                            }

                        }

                        return tooltipContent;
                    }
                },
                plotOptions: {
                    series: {
                        dataLabels: {
                            formatter: function () {
                                if (this.point.completed === undefined) {
                                    return;
                                }

                                var progress = Highcharts.numberFormat(this.point.completed.amount * 100, 2);

                                if (this.key == this.series.chart.title.textStr) {
                                    return (progress + '% OF THE SCHEDULE COMPLETED');
                                }
                                return (progress + '% progress in all sub tasks');
                            }
                        }
                    }
                },
                exporting: {
                    fallbackToExportServer: false,
                    filename: title,
                    printMaxWidth: 1920
                }
            });

        }
    });
}

//--- Switching Schedules
$('#schedules').on('click', 'a', function () {

    var containerID = $(this).attr('id') + '-graph';

    $('#containers > div').each(function () {
        $(this).hide();
    });

    $('#' + containerID).fadeIn('slow');

});