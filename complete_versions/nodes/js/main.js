/**
 * Created by John Thompson
 */

(function(){

    // The global objects for the visualization
    main = {};
    data = {};

    var chart, svg, height, width, bSliderHandle, chartDimens, defs, linksG, nodesG, maxCount = 0, sBook = 0, pBook = 0;

    var force = d3.layout.force();

    var BOOK_COLORS = {'sorcerers_stone': '#FFE246', 'chamber_of_secrets': '#CB3665', 'prisoner_of_askaban': '#CE8498',
        'goblet_of_fire': '#75A770', 'order_of_phoenix': '#098CC1', 'half_blood_prince': '#DDE86B'};

    var BOOK_COVERS = ['img/bookcovers/sorcerers_stone.png', 'img/bookcovers/chamber_of_secrets.png',
        'img/bookcovers/prisoner_of_askaban.png','img/bookcovers/goblet_of_fire.png',
        'img/bookcovers/order_of_phoenix.png','img/bookcovers/half_blood_prince.png'];

    var HOUSES = ['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff', 'InterHouse'];

    var HOUSE_COLORS = {'Gryffindor': ['#800407','#F2BE34'], 'Slytherin': ['#24581E','#9E9996'],
        'Ravenclaw': ['#F3DD0B','#0C0D08'], 'Hufflepuff': ['#0B3048', '#A67A53'], 'InterHouse': ['#000','#FFF']};

    var HOUSE_PATTERNS = ['url(#Gryffindor)','url(#Slytherin)','url(#Hufflepuff)','url(#Ravenclaw)','url(#InterHouse)'];

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

        linksG = svg.append('g')
            .attr('id', '#links-group');

        nodesG = svg.append('g')
            .attr('id', '#nodes-group');

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

        // Set up the slider at the bottom
        var bSlider = $('#book-slider').slider({max:5, value:0, slide: main.bookSelected})
            .slider("pips", {first: false, last: false});

        bSliderHandle = $('.ui-slider-handle', bSlider);

        bSliderHandle.qtip({
            id: 'uislider',
            content: '<img src=\"' + BOOK_COVERS[sBook] +'\" width=\"40px\" height=\"72px\"/>',
            position: {
                my: 'bottom center',
                at: 'top center',
                container: bSliderHandle,
            },
            hide: false,
            style: {
                widget: true
            }
        });

        bSliderHandle.qtip('show');

        // Load the data after we've set up the vis
        main.loadData(params);
    };

    main.loadData = function(params) {
        // Load data for the visualization here
        d3.json(params.datapath, function(raw){
            data.books = clone(raw[0].books);
            data.characters = [];
            data.houses = [{name: 'Gryffindor', x: width/3, y: height/3, fixed: true, classname: 'Gryffindor', imgPath: 'img/houses/gryffindor.png'},
                {name: 'Slytherin', x: width*2/3, y: height*2/3, fixed: true, classname: 'Slytherin', imgPath: 'img/houses/slytherin.png'},
                {name: 'Hufflepuff', x: width*2/3, y: height/3, fixed: true, classname: 'Hufflepuff', imgPath: 'img/houses/hufflepuff.png'},
                {name: 'Ravenclaw', x: width/3, y: height*2/3, fixed: true,classname: 'Ravenclaw', imgPath: 'img/houses/ravenclaw.png'}];
            data.houseLinks = [];

            var nameMap = {};
            var houseMap = {};
            raw.forEach(function(c){
                var chr = {name: c['name'], classname: c['classname'], gender: c['gender'], house: c['house'], year: c['year'], books: []};
                for(var i = 0; i < data.books.length; i++) {
                    var links = c.books[i].links.filter(function(d){return d.source != d.target});
                    chr.books.push({classname: data.books[i].classname, title: data.books[i].title, linkcount: links.length, links: []});
                    data.books[i].links = data.books[i].links.concat(links);
                }

                data.characters.push(chr);
                nameMap[c.classname] = chr;
                houseMap[c.classname] = c.house;
                data.houses.forEach(function(h){
                    if(h.classname == c.house) {
                        chr.house = h;
                        data.houseLinks.push({source: chr, target: h});
                    }
                });
            });

            data.books.forEach(function(b,i){
                b.count = b.links.length;
                maxCount = Math.max(b.count, maxCount);
                var links = [];
                b.links.forEach(function(l){
                    nameMap[l.source].books[i].links.push({source: nameMap[l.source], target: nameMap[l.target]});
                    links.push({source: nameMap[l.source], target: nameMap[l.target]});
                });
                b.links = links;
                b.houses = d3.nest()
                    .key(function(d){return houseMap[d.source];})
                    .rollup(function(d){return d.length;})
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
        var houseHeight = 120, houseWidth = 72;

        var houseScale = d3.scale.ordinal()
            .domain(HOUSES)
            .range(HOUSE_PATTERNS);

        var radiusScale = d3.scale.linear()
            .domain([0,20])
            .range([10,30]);

        force.nodes(data.characters.concat(data.houses))
            .links(data.books[sBook].links.concat(data.houseLinks))
            .size([width, height])
            .linkStrength(0.05)
            .friction(0.9)
            .linkDistance(90)
            .charge(-60)
            .gravity(0.01)
            .theta(0.8)
            .alpha(0.1)
            .start();

        var links = linksG.selectAll(".link")
            .data(data.books[sBook].links, function(d){return d.source.classname+d.target.classname;});

        var linksEnter = links.enter().append("g")
            .attr("class", function(d){return 'link ' + d.source.classname +'-'+ d.target.classname+' book-'+sBook;})
            .append('path');

        var linksExit = links.exit();

        linksExit.append('text')
            .text(function(d){return d.target.name;})
            .attr('y', '30')
            .style("text-anchor", "middle");

        linksExit.attr('opacity', 1)
            .transition().duration(2500)
            .attr('opacity', 0).remove();

        var houses = nodesG.selectAll('.house')
            .data(data.houses);

        var housesEnter = houses.enter()
            .append('g')
            .attr('class', function(d){return 'house '+ d.classname;})
            .attr('transform', function(d){return 'translate('+ d.x+','+ d.y+')'});

        housesEnter.append('image')
            .attr('xlink:href', function(d){return d.imgPath})
            .attr('width', houseWidth+'px')
            .attr('height', houseHeight+'px')
            .attr('x', -houseWidth/2)
            .attr('y', -houseHeight/2);

        var nodes = nodesG.selectAll(".node")
            .data(data.characters);

        var nodesEnter = nodes.enter()
            .append('g')
            .attr('class', function(d){ return 'node '+ d.classname;})
            .call(force.drag)
            .on('mouseover', highlightNode)
            .on('mouseout', deselectNode);

        nodesEnter.append("circle")
            .attr('class', 'outer')
            .attr('stroke', function(d) { return HOUSE_COLORS[d.house.classname][1];})
            .attr('stroke-width', 1.5)
            .style("fill", function(d) { return HOUSE_COLORS[d.house.classname][0]; });

        nodesEnter.append("circle")
            .attr('class', 'inner')
            .attr('stroke', function(d) { return HOUSE_COLORS[d.house.classname][1];})
            .attr('stroke-width', 1.5)
            .style("fill", function(d) { return houseScale(d.house.classname); });

        nodesEnter.append("text")
            .text(function(d){return d.name;})
            .attr('visibility', 'hidden')
            .attr('y', '30')
            .style("text-anchor", "middle");

        nodes.select('.outer')
            .attr('r', function(d){return radiusScale(d.books[sBook].linkcount) + 3;});

        nodes.select('.inner')
            .attr('r', function(d){return radiusScale(d.books[sBook].linkcount);});

        force.on("tick", function() {

            links.attr('transform', function(d){return 'translate('+ d.target.x+','+ d.target.y+')';});

            links.select('path').attr("d", function (d) {
                    return 'M0,0 L'+ (d.source.x - d.target.x) + ','+ (d.source.y - d.target.y);
                });

            linksExit.attr('transform', function(d){return 'translate('+ d.target.x+','+ d.target.y+')';});

            linksExit.select('path').attr("d", function (d) {
                return 'M0,0 L'+ (d.source.x - d.target.x) + ','+ (d.source.y - d.target.y);
            });

            nodes.attr("transform", function (d) {
                if(d.x && d.y){
                    return 'translate('+d.x+','+ d.y+')';
                } else {
                    return 'translate(0,0)';
                }

            })
        });
    };

    function highlightNode(n){
        $('.node').css({opacity: 0.5});
        $('.link').css({opacity: 0.1});

        n.books[sBook].links.forEach(function(l){
            $('.node.'+ l.target.classname).css({opacity: 1});
            $('.node.'+ l.target.classname+' text').css({visibility: 'visible'});
            $('.link.'+ n.classname+'-'+ l.target.classname).css({opacity: 1});
        });

        $('.node.'+ n.classname+' text').css({visibility: 'visible'});
        $('.node.'+ n.classname).css({opacity: 1});
    }

    function deselectNode(n){
        $('.node').css({opacity: 1});
        $('.node text').css({visibility: 'hidden'});
        $('.link').css({opacity: 1});

    }

    main.bookSelected = function(event, ui) {
        pBook = sBook;
        sBook = ui.value;
        //bSliderHandle.qtip('option', 'content.text', BOOK_COVERS[sBook]);
        bSliderHandle.qtip('option', 'content.text', '<img src=\"' + BOOK_COVERS[sBook] +'\" width=\"40px\" height=\"72px\"/>');
        main.draw();
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
