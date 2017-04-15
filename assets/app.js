function convert(date) {
    var dateParts = date.match(/(\d+)\.(\d+)\.(\d+)/);
    return new Date(parseInt(dateParts[3]), parseInt(dateParts[2]) - 1, parseInt(dateParts[1]), 1).getTime();
}

drawSchedule('3.0-schedule');

function drawSchedule(dataSet) {

    $.getJSON('assets/data/' + dataSet + '.json', function(data) {

        //--- Array to store the data
        var seriesData = [];
        var minDate = Number.MAX_SAFE_INTEGER;
        var maxDate = Number.MIN_SAFE_INTEGER;

        //--- Parse the Data
        $.each(data, function(key, value) {
            var tmp = {
                'name': value.title,
                'data': []
            };

            //--- Create Parent
            tmp.data.push({
                taskName: value.title,
                id: value.title,
                start: convert(value.start),
                end: convert(value.end)
            });

            //--- Find Start And End Of Schedule
            minDate = Math.min(minDate, convert(value.start));
            maxDate = Math.max(maxDate, convert(value.end));

            //--- Append all Childs
            $.each(value.children, function(k, v) {
                var dependencyId = null;
                $.each(v, function(k, v) {
                    tmp.data.push({
                        taskName: v.title,
                        id: v.title,
                        start: convert(v.start),
                        end: convert(v.end),
                        parent: value.title,
                        dependency: dependencyId
                    });
                    //dependencyId = v.title;
                });
            });
            seriesData.push(tmp);
        });

        // THE CHART
        Highcharts.ganttChart('container', {
            title: {
                text: 'Star Citizen - Schedule 3.0'
            },
            xAxis: {
                currentDateIndicator: true,
                min: minDate,
                max: maxDate
            },
            series: seriesData,
            tooltip: {
                formatter: function() {
                    return '<b>' + this.key + '</b> | <i>' + moment(this.point.start).format('MMMM Do, YYYY') + ' - ' + moment(this.point.end).format('MMMM Do, YYYY') + '</i>';
                }
            }
        });

    });
}

//--- Switching Schedules
$('#schedules').on('click', '*', function() {
    drawSchedule($(this).attr('data-value'));
});
