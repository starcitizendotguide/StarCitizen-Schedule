function convert(date) {
    var dateParts = date.match(/(\d+)\.(\d+)\.(\d+)/);
    return new Date(parseInt(dateParts[3]), parseInt(dateParts[2]) - 1, parseInt(dateParts[1]), 1).getTime();
}

//--- Draw Default
drawSchedule('3.0-schedule', '3.0 Schedule', false);

function drawSchedule(dataSet, title, criticalPath) {

    $.getJSON('assets/data/' + dataSet + '.json', function(data) {

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
            minDate = Math.min(minDate, convert(value.start));
            maxDate = Math.max(maxDate, convert(value.end));

            //--- Overall
            var overallDone = 0;
            var weight = 0;
            $.each(value.children, function(k, v) {
                $.each(v, function(k, v) {
                    weight += moment(convert(v.end)).diff(convert(v.start));
                })
            });

            //--- Append all Childs
            $.each(value.children, function(k, v) {
                var dependencyId = null;
                $.each(v, function(k, v) {

                    //--- Converting start & end point to Date
                    var s = convert(v.start), e = convert(v.end);

                    //--- How much is overall done by multipling it with its according weight.
                    overallDone += Math.max(0, Math.min(1, parseFloat(moment().diff(s) / moment(e).diff(s)))) * (moment(e).diff(s) / weight);

                    //--- Add data
                    tmp.data.push({
                        taskName: v.title,
                        id: v.title,
                        start: s,
                        end: e,
                        parent: value.title,
                        dependency: dependencyId,
                        /*
                        details: {
                            advantage: 'Performance Improvement',
                            description: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
                        }*/
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
                start: convert(value.start),
                end: convert(value.end),
                completed: {
                    amount: parseFloat(overallDone.toFixed(4)),
                    fill: '#40e6f0'
                }
            });

            //--- Push Final Data
            seriesData.push(tmp);

        });


        var fontColor = '#3FC9E1';
        Highcharts.ganttChart('container', {
            series: seriesData,
            chart: {
                backgroundColor: 'rgba(255, 255, 255, 0)',
                style: {
                    fontFamily: 'Electrolize',
                    color: fontColor
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
                    var value = '<b>' + this.key + '</b> | <i>' + moment(this.point.start).format('MMMM Do, YYYY') + ' - ' + moment(this.point.end).format('MMMM Do, YYYY');

                    if(this.point.hasOwnProperty('details')) {
                        var advantage = this.point.details.advantage;
                        var description = this.point.details.description;
                        //--- Append Advantage
                        if(!(advantage === undefined)) {
                            value += '<br /><b>Advantage:</b> ' + advantage;
                        }

                        //--- Append Description
                        if(!(description === undefined)) {
                            value += '<br /><b>Description:</b> ' + description;
                        }
                    }

                    return value;
                }
            },
            plotOptions: {
                series: {
                    dataLabels: {
                        formatter: function() {
                            if(this.point.completed === undefined) {
                                return;
                            }
                            return Highcharts.numberFormat(this.point.completed.amount * 100, 2) + '% of all sub tasks completed';
                        }
                    }
                }
            }
        });
    });
}

//--- Switching Schedules
$('#schedules').on('click', '*', function() {
    drawSchedule($(this).attr('data-value'), $(this).attr('data-title'), $('#criticalPath').checked);
});
