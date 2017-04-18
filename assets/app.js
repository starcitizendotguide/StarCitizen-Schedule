function convertToDate(date, start) {
    var dateParts = date.match(/(\d+)\.(\d+)\.(\d+)/);
    return new Date(parseInt(dateParts[3]), parseInt(dateParts[2]) - 1, parseInt(dateParts[1]), (start ? 0 : 23), (start ? 0 : 59), (start ? 0 : 59), (start ? 0 : 999)).getTime();
}

function convertContentToContainer(containerID) {
    return containerID.toLowerCase().replace(/[^\w ]+/g,'').replace(/ +/g,'-');
}

//--- We are storing this to display the first graph when everything else is done and the
// page is ready to be shown.
var firstGraphToDraw = null;
var drawFirst = false;

//--- Map to store the details
var detailMap = [];

//--- Draw Schedules
$(document).ready(function() {
        
    //--- Hide menue & disclaimer
    $('#schedules').hide();
    $('.disclaimer').hide();
        
    //--- Load all details
    $.getJSON('assets/data/details.json', function (details) {

        $.each(details, function (k, detail) {
               
            detailMap[detail.id] = detail.content;

        });

    });

    //--- Load & Draw All Schedules
    $.getJSON('assets/data/index.json', function(indicies) {

        $.each(indicies, function(k, index) {
            
            //--- Create content id
            var contentID = convertContentToContainer(index.name);
            var containerID = contentID + '-graph';

            if (firstGraphToDraw === null) firstGraphToDraw = containerID;

            //--- Append menue & tab
            $('#schedules').append('<li><a href="#" id="' + contentID + '">' + index.name  + '</a></li>');
            $('#containers').append('<div style="width: 98%;" id="' + containerID + '"></div>')

            //--- Draw schedule
            if (k === indicies.length - 1) {
                //--- Loading done when we arrived at the last schedule
                drawFirst = true;
            }
            drawSchedule(index.file, index.name, containerID, false);
            
        });

        //--- Hide & Seek
        $('#containers > div').each(function() {
            $(this).hide();
        });
    });

});

function drawSchedule(file, title, containerID, criticalPath) {

    $.getJSON('assets/data/schedules/' + file, function (data) {

        //--- Array to store the data
        var seriesData = [];
        var highlights = [];

        var minDate = Number.MAX_SAFE_INTEGER;
        var maxDate = Number.MIN_SAFE_INTEGER;

        //--- Parse the Data
        $.each(data, function(key, value) {

            //--- Data Building for our default Gantt Diagramm
            var tmp = {
                'name': value.title,
                'data': []
            };

            //--- Find Start And End Of Schedule
            minDate = Math.min(minDate, convertToDate(value.start, true));
            maxDate = Math.max(maxDate, convertToDate(value.end, false));

            //--- Overall
            var overallDone = 0;
            var weight = 0;
            $.each(value.children, function(k, v) {
                $.each(v, function(k, v) {
                    weight += moment(convertToDate(v.end, false)).diff(convertToDate(v.start, true));
                })
            });

            //--- Local min & max
            var localMinDate = Number.MAX_SAFE_INTEGER;
            var localMaxDate = Number.MIN_SAFE_INTEGER;

            //--- Append all Childs
            $.each(value.children, function(k, v) {
                var dependencyId = null;
                $.each(v, function(k, v) {

                    //--- Converting start & end point to Date
                    var s = convertToDate(v.start, true), e = convertToDate(v.end, false);

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
                    });

                    //--- Only store if we wanna draw the critical path, otherwise
                    // we can just ignore it
                    if(criticalPath) {
                        dependencyId = v.title;
                    }
                });

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
                }
            });

            //--- Push Final Data
            seriesData.push(tmp);

        });

        //--- Some settings
        var ignoreFirstLoad = true;
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
                    load: function(event) {
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
            xAxis:{
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
                    formatter: function() {
                        if(highlights.includes(this.value)) {
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
                style: {
                    width: '400%'
                },
                formatter: function() {
                    var tooltipContent = '<b>' + this.key + '</b> | <i>' + moment(this.point.start).format('MMMM Do, YYYY') + ' - ' + moment(this.point.end).format('MMMM Do, YYYY');

                    if (!(this.point.detailID === undefined)) {
                        $.each(detailMap[this.point.detailID], function (k, value) {
                            tooltipContent += '<br />' + value.title + ' ' + value.text;
                        });
                    }

                    return tooltipContent;
                }
            },
            plotOptions: {
                series: {
                    dataLabels: {
                        formatter: function() {
                            if(this.point.completed === undefined) {
                                return;
                            }
                            return Highcharts.numberFormat(this.point.completed.amount * 100, 2) + '% progress in all sub tasks';
                        }
                    }
                }
            },
            /*TODO exporting: {
                fallbackToExportServer: false
            }*/
        });
    });
}

//--- Switching Schedules
$('#schedules').on('click', 'a', function() {

    var containerID = $(this).attr('id') + '-graph';

    $('#containers > div').each(function() {
        $(this).hide();
    });

    $('#' + containerID).fadeIn('slow');

});
