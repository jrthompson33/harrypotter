/**
 * Created by John Thompson
 */

(function(){

    // The global objects for the visualization
    main = {};
    data = {};

    var chart, svg, height, width, chartDimens, defs, maxCount = 0;

    var BOOK_COLORS = {'sorcerers_stone': '#FFE246', 'chamber_of_secrets': '#CB3665', 'prisoner_of_askaban': '#CE8498',
        'goblet_of_fire': '#75A770', 'order_of_phoenix': '#098CC1', 'half_blood_prince': '#DDE86B'};

    var BOOK_COVERS = {'sorcerers_stone': 'img/bookcovers/sorcerers_stone.png', 'chamber_of_secrets': 'img/bookcovers/chamber_of_secrets.png',
        'prisoner_of_askaban': 'img/bookcovers/prisoner_of_askaban.png', 'goblet_of_fire': 'img/bookcovers/goblet_of_fire.png',
        'order_of_phoenix': 'img/bookcovers/order_of_phoenix.png', 'half_blood_prince': 'img/bookcovers/half_blood_prince.png'};

    var HOUSES = ['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff', 'InterHouse'];

    var HOUSE_COLORS = {'Gryffindor': ['#800407','#F2BE34'], 'Slytherin': ['#24581E','#9E9996'],
        'Ravenclaw': ['#F3DD0B','#0C0D08'], 'Hufflepuff': ['#0B3048', '#A67A53'], 'InterHouse': ['#000','#FFF']};

    var HOUSE_PATTERNS = ['url(#Gryffindor)','url(#Slytherin)','url(#Ravenclaw)','url(#Hufflepuff)', 'url(#InterHouse)'];

    var HOUSE_FILLS = [];
    /**
     * Initialize the visualization
     * @param params - functions as the context of the tool
     */
    main.init = function (params) {
        // Initialize things for the overall visualization
        chart = d3.select("#vis");
        height = params.height || 500;
        width = params.width || 960;
        chartDimens = {height: height, width: width};
        chart.selectAll("svg").data([chartDimens], function(d){return 'chart';}).enter().append("svg");
        svg = chart.select("svg");
        svg.attr("height", function(d) {return d.height;})
            .attr("width", function(d) {return d.width;});

        defs = svg.append('defs');

        var housedef = defs.selectAll('pattern').data(Object.keys(HOUSE_COLORS))
            .enter().append('pattern')
            .attr('id', function(d){return d;})
            .attr('width', '10')
            .attr('height', '10')
            .attr('patternUnits', 'userSpaceOnUse');

        housedef.append('path')
            .attr('d', 'M0,0 L10,0 L10,10 L0,10 L0,0')
            .attr('fill', function(d){return HOUSE_COLORS[d][0]});

        housedef.append('path')
            .attr('d', 'M0,5 L5,10 L10,5 L5,0 L0,5')
            .attr('fill', function(d){return HOUSE_COLORS[d][1]});


        // Load the data after we've set up the vis
        main.loadData(params);
    };

    main.loadData = function(params) {
        // Load data for the visualization here
        d3.json(params.datapath, function(raw){
            data.books = clone(raw[0].books);

            var nameMap = {};
            var houseMap = {};
            raw.forEach(function(c){
                nameMap[c.classname] = c;
                houseMap[c.classname] = c.house;
                for(var i = 0; i < data.books.length; i++) {
                    data.books[i].links.push.apply(data.books[i].links,
                        c.books[i].links.filter(function(d){return d.source != d.target}));
                }
            });

            data.books.forEach(function(b){
                b.count = b.links.length;
                maxCount = Math.max(b.count, maxCount);
                var start = 0;
                b.houses = d3.nest()
                    .key(function(d){
                        return houseMap[d.source] == houseMap[d.target] ? houseMap[d.source] : 'InterHouse';
                    })
                    .rollup(function(d){
                        var v = {start: start, count: d.length};
                        start += d.length;
                        return v;
                    })
                    .entries(b.links);
            });

            // Once the data is loaded - draw the vis
            main.draw(params);
        });
    };

    main.draw = function() {

        // Create your name in the my info header
        d3.select('#my-info').selectAll('span')
            // Data call specifies the iterable array that will be mapped to all "span"s
            .data(['John Thompson', '2nd year', 'Gryffindor'])
            // Enter is the first part of our data join - it changes are selection to all elements
            // that do not have a __data__ object mapped to the "span"
            .enter()
            // append adds a DOM element with the specified tag that we provide
            // in this case a <span></span> element will be added
            .append('span')
            // specify the inner text element that the span will hold
            // the span will look like this for my name <span>John Thompson</span>
            // function(d) is a callback where we declare what parameter of the data that is bound will specify this attribute
            // in this case the data is a string - e.g. "John Thompson" so we can return as the text element
            .text(function(d){return d;});

        // constants for bar chart
        var barWidth = Math.max(width/25, 10);
        var imgHeight = 75, imgWidth = 48;

        // y scale that we use, maxCount is the maximum number of support links
        var yScale = d3.scale.linear()
            .domain([0, maxCount])
            .range([height/2,0]);

        // x scale that we use - it is an ordinal, so we can plug in the book class name and get out where the x location of the bar should be
        var xScale = d3.scale.ordinal()
            .domain(["sorcerers_stone","chamber_of_secrets", "prisoner_of_askaban","goblet_of_fire","order_of_phoenix","half_blood_prince"])
            .rangeRoundBands([0, width/2],1);

        var houseScale = d3.scale.ordinal()
            .domain(HOUSES)
            .range(HOUSE_PATTERNS);

        // x axis that we use, re-use the scale object from above
        var xAxis = d3.svg.axis()
            .scale(xScale)
            // Don't return a tick here, we'll use the book images
            .tickFormat(function(t){return '';})
            .orient('bottom');

        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient('left');

        var barchart = svg.selectAll('.barchart').data([{x: width/4, y: height/4}], function(d){return 'barchart';});

        var barchartEnter = barchart.enter().append('g')
            .attr('class', 'barchart');

        barchart.attr('transform', function(d){return 'translate('+ d.x+','+ d.y+')';});

        var bars = barchart.selectAll('.book')
            .data(data.books, function(d){return d.classname});

        var barsEnter = bars.enter().append('g')
            .attr('class', function(d){return 'book '+ d.classname;});

        bars.transition().duration(500).ease('slow-out')
            .attr('transform', function(d){return 'translate('+xScale(d.classname)+',0)';});

        var houses = barsEnter.selectAll('.house')
            .data(function(d){ return d.houses;});

        houses.enter().append('rect')
            .attr('stroke', '#333')
            .attr('stroke-width', '0.5px')
            .attr('width', barWidth)
            .attr('x', -barWidth/2)
            .attr('fill', function(d){return 'url(#'+d.key+')';});

        barsEnter.append('image')
            .attr('xlink:href', function(d){return BOOK_COVERS[d.classname];})
            .attr('width', imgWidth+'px')
            .attr('height', imgHeight+'px')
            .attr('x', -barWidth/2);

        houses.attr('y', function(d){return yScale(d.values.count+d.values.start);})
            .transition().duration(500).ease('slow-out')
            .attr('height', function(d){return height/2 - yScale(d.values.count);});

        bars.selectAll('image').attr('y', (height/2+10)+'px');

        barchartEnter.append('g')
            .attr('class', 'x axis')
            .call(xAxis);

        barchartEnter.append('g')
            .attr('class', 'y axis')
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", "-3.6em")
            .attr('x', -height/4)
            .style("text-anchor", "middle")
            .text("Character Support Links");

        barchart.select('.y.axis')
            .transition().duration(500).ease('slow-out')
            .call(yAxis);

        barchart.select('.x.axis')
            .attr('transform', 'translate(0,'+height/2+')')
            .transition().duration(500).ease('slow-out')
            .call(xAxis);

        barchartEnter.append("g")
            .attr("class", "legend")
            .attr("transform", "translate(20,20)");

        var legend = d3.legend.color()
            .scale(houseScale);

        svg.select(".legend")
            .call(legend);

    };

    main.resizeWindow = function() {
        // Resize the visualization
        height = $(window).height() - $('#navigation').height() - 45;
        width = $('#vis').width();

        chartDimens.height = height;
        chartDimens.width = width;

        svg = chart.select("svg");
        svg.attr("height", function(d) {return d.height;})
            .attr("width", function(d) {return d.width;});

        if(data.books)main.draw();
    }
})();
