function convert(date) {
    var dateParts = date.match(/(\d+)\.(\d+)\.(\d+)/);
    return new Date(parseInt(dateParts[3]), parseInt(dateParts[2]) - 1, parseInt(dateParts[1]), 1).getTime();
}

//--- Draw Default
drawSchedule('3.0-schedule', '3.0 Schedule');

function drawSchedule(dataSet, title) {

    $.getJSON('assets/data/' + dataSet + '.json', function(data) {

        //--- Array to store the data
        var seriesData = [];
        var minDate = Number.MAX_SAFE_INTEGER;
        var maxDate = Number.MIN_SAFE_INTEGER;

        //--- Parse the Data
        $.each(data, function(key, value) {

            //--- Data Building for our default Gantt Diagramm
            var tmp = {
                'name': value.title,
                'data': []
            };

            //--- Create Parent
            tmp.data.push();

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
                        //dependency: dependencyId
                    });
                    dependencyId = v.title;
                });

            });

            tmp.data.unshift({
                taskName: value.title,
                id: value.title,
                start: convert(value.start),
                end: convert(value.end),
                completed: {
                    amount: parseFloat(overallDone.toFixed(4)),
                    fill: '#00FF94'
                }
            });

            //--- Push Final Data
            seriesData.push(tmp);

        });

        Highcharts.ganttChart('container', {
            title: {
                text: title
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
    drawSchedule($(this).attr('data-value'), $(this).attr('data-title'));
});
