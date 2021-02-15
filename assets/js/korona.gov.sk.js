/**
 * mapa.covid.chat
 * (c) 2020 bot.media
 */

function isMobile() {
    var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    if (width < 740) {
        return true;
    }
    return false;
}

function drawBar(x,y,w,h,r,f) {
    if(f == undefined) f = 1;
    if (h <= r) r = 0;
    var x0 = x+r, x1 = x+w-r, y0 = y-h+r;
    var parts = [
        "M",x,y,
        "L",x,y0,
        "A",r,r,0,0,f,x0,y-h,
        "L",x1,y-h,
        "A",r,r,0,0,f,x+w,y0,
        "L",x+w,y,
        "Z"
    ];
    return parts.join(" ");
}

function getFillColor(type) {
    if (type == "deaths") {
        return "#666666";
    } else if (type == "infected") {
        return "#FF6464";
    } else if (type == "recovered") {
        return "#5BC859";
    } else if (type == "tested") {
        return "#5C1F99";
    } else if (type == "default") {
        return "#1d70b8";
    } else if (type == "active") {
        return "#1d70b8";
    } else if (type == "vaccinated") {
        return "#5BC859";
    } else if (type == "vaccinated2") {
        return "#5BC859";
    }
    return "transparent";
}

function renderChart(element, data, series, bar, events, forceClass) {
    var el = d3.select(element);
    el.selectAll("*").remove();
    el.attr("class", "chart");

    var elWidth = el.node().getBoundingClientRect().width;
    var elHeight = el.node().getBoundingClientRect().height;

    if (elHeight < 225)
        elHeight = 225;

    if (elWidth < 100)
        elWidth = 100;

    var margin = { top: 20, right: 20, bottom: 25, left: 55 };
    var width = elWidth - margin.left - margin.right;
    var height = elHeight - margin.top - margin.bottom;
    var barWidth = (width/data.length)*0.8;

    var parseTime = d3.timeParse("%d-%m-%Y");
    var x = d3.scaleTime().range([0, width]);
    var y = d3.scaleLinear().range([height, 0]);

    if (bar) {
        var bw = (width/data.length);
        x = d3.scaleTime().range([bw/2, width - (bw/2)]);
    }

    var svgWidth = width + margin.left + margin.right;
    var svgHeight = height + margin.top + margin.bottom;
    var svg = el.append("svg")
        .attr("viewBox", "0 0 " + svgWidth + " " + svgHeight)
        .attr("height", svgHeight)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // format the data
    var maxValue = 0;
    data.forEach(function(d) {
        d.date_day = d.date;
        d.parsed_date = (typeof(d.date) == "string") ? parseTime(d.date) : d.date;
        series.forEach(function(i) {
            d[i.key] = parseInt(d[i.key]);
            maxValue = Math.max(maxValue, d[i.key]);
        });
    });

    // Scale the range of the data
    x.domain(d3.extent(data, function(d) { return d.parsed_date; }));
    y.domain([0, maxValue]);

    var xTickValues = data.filter(function(d, i) { return i % Math.floor(data.length / 3.5) === 0 }).map(function(d) { return d.parsed_date; });

    // axis
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .attr("class", "axis")
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%d. %m.")).tickValues(xTickValues));

    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(6));

    // tooltip line should be behind
    var tooltipLine = svg.append('line')
        .attr('opacity', 0.25)
        .style("stroke", "#000000")
        .style("stroke-width", "1.5")
        .style("stroke-dasharray", ("2, 2"))
        .attr("class", "recovered");

    // areas
    series.forEach(function(i) {
        if (bar)
            return;

        var area = d3.area()
            .x(function(d) { return x(d.parsed_date); })
            .y0(height)
            .y1(function(d) { return y(d[i.key]); })
            .curve(d3.curveMonotoneX);
        svg.append("path")
            .data([data])
            .attr("class", (forceClass ? forceClass : i.key) + "-background")
            .style("fill", "url(#" + (forceClass ? forceClass : i.key) + "-gradient)")
            .attr("d", area);

        // gradients definitions
        var svgDefs = svg.append('defs');
        var gradient = svgDefs.append('linearGradient')
            .attr('x1', '0')
            .attr('x2', '0')
            .attr('y1', '0')
            .attr('y2', '1')
            .attr('id', (forceClass ? forceClass : i.key) + '-gradient');
        gradient.append('stop')
            .attr('stop-color', getFillColor(forceClass ? forceClass : i.key))
            .attr('offset', '0');
        gradient.append('stop')
            .attr('stop-color', getFillColor(forceClass ? forceClass : i.key))
            .attr('stop-opacity', '0')
            .attr('offset', '1');
    });

    // lines
    series.forEach(function(i) {
        if (bar)
            return;

        svg.append("path")
            .data([data])
            .attr("class", forceClass ? forceClass : i.key)
            .style("fill", "none")
            .style("stroke-width", 2)
            .attr("d", d3.line()
                .x(function(d) { return x(d.parsed_date); })
                .y(function(d) { return y(d[i.key]); })
                .curve(d3.curveMonotoneX));
    });

    // dots
    series.forEach(function(i) {
        if (bar)
            return;

        svg.selectAll(null).data(data)
            .enter().append("circle")
            .attr("class", function (d) { return (forceClass ? forceClass : i.key) + " dot dot-" + d3.timeFormat("%d-%m-%Y")(d.parsed_date); })
            .attr("cx", function(d) { return x(d.parsed_date); })
            .attr("cy", function(d) { return y(d[i.key]); })
            .attr("r", 0);
    });

    // bars
    series.forEach(function(i) {
        if (!bar)
            return;

        svg.selectAll(null).data(data)
            .enter().append("path")
            .attr("class", forceClass ? forceClass : i.key)
            .attr("d", function(d) {
                return drawBar(x(d.parsed_date) - (barWidth/2), y(0), barWidth, y(0)-y(d[i.key]), 2);
            });

        /*svg.selectAll("bars").data(data)
            .enter().append("rect")
            .attr("class", i.key)
            .attr("x", function(d) { return x(d.date) - (barWidth/2); })
            .attr("width", barWidth)
            .attr("y", function(d) { return y(d[i.key]); })
            .attr('height', function(d) { return height - y(d[i.key]); })
            */
    });

    // render events to chart
    if (events) {
        var boundaryCheck = function(d) {
            var currentDate = parseTime(d.day);
            if (data.length < 1)
                return false;
            var a = data[0].parsed_date;
            var b = data[data.length - 1].parsed_date;
            if (currentDate < a || currentDate > b)
                return false;
            return true;
        };

        var majorCheck = function(d) {
            var screen = window.innerWidth || document.body.clientWidth;
            if (screen < 640) {
                return false;
            }

            return d.major && d.major == 1;
        };

        svg.selectAll(null).data(events)
            .enter().filter(boundaryCheck).append('line')
            .attr('opacity', function(d) { return majorCheck(d) ? 0.5 : 0.10; })
            .style("stroke", "#000000")
            .style("stroke-width", "1.5")
            .style("stroke-dasharray", ("2, 2"))
            .attr('x1', function(d) { return x(parseTime(d.day)); })
            .attr('x2', function(d) { return x(parseTime(d.day)); })
            .attr('y1', 0)
            .attr('y2', height);

        svg.selectAll(null).data(events)
            .enter().filter(boundaryCheck).filter(majorCheck).append("text")
            .text(function(d) {
                return d.title;
            })
          /*  .attr("style", "paint-order:stroke;stroke:#ffffff;stroke-width:2px;stroke-linecap:butt;stroke-linejoin:miter") */
            .attr("fill", "black")
            .attr("font-size", "14px")
            .attr("transform", function(d){
                var xText = x(parseTime(d.day)) + 3;
                var yText = 5;
                return "translate(" + xText + "," + yText + ") rotate(90)";
            });
    }

    // tooltips
    var tooltip = el.append("div").attr("class", "chart-tooltip");
    tooltip.style('display', 'none');

    var timeout;

    var tipBox = svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('opacity', 0)
        .on("mousemove touchmove", function(e) {
                d3.event.preventDefault();

                /*
                // clean timeout
                if (timeout) clearTimeout(timeout);
                timeout = setTimeout(function() {
                    tooltip.style('display', 'none');
                    tooltipLine.attr('x1', null).attr('x2', null).attr('y1', null).attr('y2', null);
                    svg.selectAll(".dot").classed('highlight', false);
                }, 5000);
                */

                var offsetX = d3.mouse(tipBox.node())[0]; // from left
                var cursorValueX = x.invert(offsetX);
                var valueX = cursorValueX;
                var item = null;

                var closest = -1;
                for (var i = 0; i < data.length; i++) {
                    var distance = Math.abs(cursorValueX - data[i].parsed_date);
                    if (distance < closest || closest == -1) {
                        valueX = data[i].parsed_date;
                        closest = distance;
                        item = data[i];
                    }
                }

                tooltipLine.attr('stroke', 'black')
                    .attr('x1', x(valueX))
                    .attr('x2', x(valueX))
                    .attr('y1', 0)  //y(item.infected))
                    .attr('y2', height);

                var html = '<strong>' + item.day + ' ' + d3.timeFormat("%d. %m.")(item.parsed_date) + '</strong>';

                // add event to tooltip
                if (events) {
                    for (var i in events) {
                        var ev = events[i];
                        if (ev.day == item.date_day) {
                            html += "<br>" + ev.title + "<br>";
                        }
                    }
                }

                series.forEach(function(i) {
                    html += '<br><span class="gray">' + i.title + ':</span> <span class="' + (forceClass ? forceClass : i.key) + '">' + item[i.key] + '</span>';
                });

                tooltip
                    .style('display', 'block')
                    .style('left', (offsetX > width / 2) ? margin.left + 5 + "px" :  "auto")
                    .style('right', (offsetX > width / 2) ? "auto" : margin.right + 5 + "px")
                    .style('top', margin.top + "px")
                    .html(html);

                // dots sizing
                svg.selectAll(".dot").classed('highlight', false);
                svg.selectAll(".dot-" + d3.timeFormat("%d-%m-%Y")(item.parsed_date)).classed('highlight', true);
            }
        );
}

function initCustomTable(tableId, inData, metrics) {
    var resultHtml = "";

    resultHtml += "<tr>";
    resultHtml += "<th>Dátum</th>";
    for (var i in metrics) {
        resultHtml += "<th style='text-align:right'>" + metrics[i].title + "</th>";
    }
    resultHtml += "</tr>";

    var data = inData.slice(0).reverse(); // do not mutate original

    for (var i in data) {
        var item = data[i];

        var parseTime = d3.timeParse("%d-%m-%Y");
        var date = (typeof(item.date) == "string") ? parseTime(item.date) : item.date;

        resultHtml += "<tr>";
        resultHtml += "<td>" + d3.timeFormat("%d.%m.%Y")(date) + "</td>";

        for (var i in metrics) {
            resultHtml += "<td style='text-align:right'>" + item[metrics[i].key] + "</td>";
        }

        resultHtml += "</tr>";
    }

    document.getElementById(tableId).innerHTML = resultHtml;
}


function renderTable(data) {
    var resultHtml = "";

    resultHtml += "<tr>";
    resultHtml += "<th>Okres</th>";
    resultHtml += "<th>RúVZ</th>";
    resultHtml += "<th>Stav</th>";
    resultHtml += "<th>Potvrdení</th>";
    resultHtml += "</tr>";

    for (var i in data) {
        var item = data[i];

        var stav = "";
        if (item.light == 1) {
            stav = "zelená"
        } else if (item.light == 2) {
            stav = "žltá"
        } else if (item.light == 3) {
            stav = "červená"
        }

        resultHtml += "<tr>";
        resultHtml += "<td>" + item.district + "</td>";
        resultHtml += "<td><a href='" + item.link + "' target='_blank'>" + item.ruvz + "</a></td>";
        resultHtml += "<td>" + item.light + " - " + stav + "</td>";
        resultHtml += "<td>" + item.count + "</td>";
        resultHtml += "</tr>";
    }

    document.getElementById("custom-table").innerHTML = resultHtml;
}



var currentRange = false;
var currentMetric = "";
var currentData = null;

function renderData(data) {
    var points = data.chart;
    //document.getElementById("updated").innerText = data.updated;

    if (currentRange && parseInt(currentRange) > 0) {
        points = points.slice(-1 * parseInt(currentRange));
    }

    if (window.location.href.indexOf("/daily") > -1) {
        // test
    } else {
        var metrics = [
            {"key": currentMetric, "title": "Počet"}
        ];

        if (currentMetric == "") {
            metrics = [
                {"key": "active", "title": "Počet aktívnych"},
                {"key": "infected", "title": "Počet potvrdených PCR testami"},
                {"key": "recovered", "title": "Počet vyliečených"},
                {"key": "deaths", "title": "Počet úmrtí"},
                {"key": "vaccinated2", "title": "Počet zaočkovaných (1. aj 2. dávka)"},
            ];
        }

        /*
            {"key": "tested_daily", "title": "počet denných testov"},
            {"key": "infected_daily", "title": "počet denných prirastkov"},
        */

        var barChart = false;
        if (currentMetric == "tested_daily" || currentMetric == "infected_daily")
            barChart = true;

        renderChart("#chart", points, metrics, barChart, data.events, currentMetric == "" ? false : "default");
        initCustomTable("custom-table", points, metrics);
    }
}

function loadData() {
    if (!document.getElementById("chart")) {
        loadMap();

        d3.json("https://mapa.covid.chat/admin/map_lights/data", function(data) {
            renderTable(data);
        });
        return;
    }

    if (currentData) {
        renderData(currentData);
        return;
    }

    d3.json("https://mapa.covid.chat/map_data", function(data) {
        currentData = data;
        renderData(data);
    });
}

function loadMetric() {
    currentMetric = document.getElementById("metric").value;
    loadData();
}

function loadRange() {
    if (document.getElementById("range")) {
        currentRange = document.getElementById("range").value;
    }
    loadData();
}

function loadMode(mode) {
    // var mode = document.getElementById("mode").value;
    document.getElementById("mode-table").className = "";

    if (document.getElementById("mode-chart"))
        document.getElementById("mode-chart").className = "";

    if (document.getElementById("mode-map"))
        document.getElementById("mode-map").className = "";

    document.getElementById("mode-" + mode).className = "selected";

    if (document.getElementById("selects"))
        document.getElementById("selects").style.display = "none";

    if (document.getElementById("selects-alt"))
        document.getElementById("selects-alt").style.display = "none";

    document.getElementById("table").style.display = "none";

    if (document.getElementById("chart"))
        document.getElementById("chart").style.display = "none";

    if (document.getElementById("map"))
        document.getElementById("map").style.display = "none";

    if (mode == "chart") {
        document.getElementById("chart").style.display = "block";
    } else if (mode == "table") {
        document.getElementById("table").style.display = "block";
    } else if (mode == "map") {
        if (document.getElementById("selects-alt"))
            document.getElementById("selects-alt").style.display = "block";

        document.getElementById("map").style.display = "block";
        loadMap();
        return;
    }

    if (document.getElementById("selects"))
        document.getElementById("selects").style.display = "block";

    loadData();
}

function loadMap() {
    var link = document.getElementById('metric-semaphore').value;
    document.getElementById("map-frame").src = link;
}

function init() {
    // set 30 days on phone
    if (isMobile() && document.getElementById("range")) {
        document.getElementById("range").value = 30;
        currentRange = 30;
    }

    loadData();
}

if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
} else {
    document.addEventListener("DOMContentLoaded", function() {
        init();
    });
}

window.addEventListener("resize", function() {
    loadData();
});
