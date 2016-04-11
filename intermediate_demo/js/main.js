/**
 * Created by John Thompson
 */

(function(){

    // The global objects for the visualization
    main = {};
    data = {};

    // probably don't need to worry about any of these vars
    var chart, svg, height, width, bSliderHandle, chartDimens;

    // the svg groups that will contain the links and nodes for the visualization
    var linksG, nodesG;

    // the maxcount of links
    var maxCount = 0;

    // The currently selected book, I update this for you
    var sBook = 0;

    // The previously selected book, I update this for you
    var pBook = 0;

    // the d3.force layout function that will generate the locations of the nodes based on our parameters
    var force = d3.layout.force();

    var BOOK_COVERS = ['img/bookcovers/sorcerers_stone.png', 'img/bookcovers/chamber_of_secrets.png',
        'img/bookcovers/prisoner_of_askaban.png','img/bookcovers/goblet_of_fire.png',
        'img/bookcovers/order_of_phoenix.png','img/bookcovers/half_blood_prince.png'];

    // A list of the houses that are in HP
    var HOUSES = ['Gryffindor', 'Slytherin', 'Ravenclaw', 'Hufflepuff'];

    // A mapping for the house colors - you can access them by calling HOUSE_COLORS['Gryffindor'][0] for the crimson color
    var HOUSE_COLORS = {'Gryffindor': ['#800407','#F2BE34'], 'Slytherin': ['#24581E','#9E9996'],
        'Ravenclaw': ['#F3DD0B','#0C0D08'], 'Hufflepuff': ['#0B3048', '#A67A53']};

    // a list of the house patterns that have the argyle/patchwork look
    var HOUSE_PATTERNS = ['url(#Gryffindor)','url(#Slytherin)','url(#Hufflepuff)','url(#Ravenclaw)','url(#InterHouse)'];

    /**
     * Initialize the visualization
     * @param params - functions as the context of the tool
     */
    main.init = function (params) {
        // Initialize things for the overall visualization
        chart = d3.select("#vis");
        height = params.height || 500;
        width = params.width || 960;

        // Creates the svg for the chart that we are going to use
        chartDimens = {height: height, width: width};
        chart.selectAll("svg").data([chartDimens], function(d){return 'chart';}).enter().append("svg");
        svg = chart.select("svg");
        svg.attr("height", function(d) {return d.height;})
            .attr("width", function(d) {return d.width;});

        // Creates the grouping for the links so they show below the nodes
        linksG = svg.append('g')
            .attr('id', '#links-group');

        // Creates the grouping for the nodes so they show above the links
        nodesG = svg.append('g')
            .attr('id', '#nodes-group');

        // Define the the pattern definitions for the house checker patchwork
        var defs = svg.append('defs');
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

        // Set up the slider at the bottom that will update the sBook variable
        // this uses a bunch of ui toolkits - JQuery UI, Slider PIPS, and qTip2 to make this
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
            // takes in the books, just so happens the first character has no links
            data.books = clone(raw[0].books);
            // specify the array of characters that we'll draw nodes for
            data.characters = [];
            // specify the array of houses that we'll draw in the center of graph
            // the force layout will give x and y values for the characters but we want the houses to be fixed
            data.houses = [{name: 'Gryffindor', x: width/3, y: height/3, fixed: true, classname: 'Gryffindor', imgPath: 'img/houses/gryffindor.png'},
                {name: 'Slytherin', x: width*2/3, y: height*2/3, fixed: true, classname: 'Slytherin', imgPath: 'img/houses/slytherin.png'},
                {name: 'Hufflepuff', x: width*2/3, y: height/3, fixed: true, classname: 'Hufflepuff', imgPath: 'img/houses/hufflepuff.png'},
                {name: 'Ravenclaw', x: width/3, y: height*2/3, fixed: true,classname: 'Ravenclaw', imgPath: 'img/houses/ravenclaw.png'}];
            data.houseLinks = [];

            // need some maps to sort through the data and get it in the format that we want it
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

            // add all of the links for each book and put them in the right location, also add the links to the character objects
            // so that we can highlight connected nodes on hover
            data.books.forEach(function(b,i){
                b.count = b.links.length;
                maxCount = Math.max(b.count, maxCount);
                var links = [];
                b.links.forEach(function(l){
                    nameMap[l.source].books[i].links.push({source: nameMap[l.source], target: nameMap[l.target]});
                    links.push({source: nameMap[l.source], target: nameMap[l.target]});
                });
                // Making a count of the number of links per house
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

        // select #my-info div and then select all the spans and append the following data in an array as spans:
        // Your Name
        // Your Year
        // Your Favorite house

        // constants for the display
        var houseHeight = 120, houseWidth = 72;
        var margin = 20;

        // maps the house classname to a pattern url for the fill
        var houseScale = d3.scale.ordinal()
            .domain(HOUSES)
            .range(HOUSE_PATTERNS);

        // maps the number of links to the radius of the circle of the node
        var radiusScale = d3.scale.linear()
            .domain([0,20])
            .range([10,30]);

        // Update call for the force node, this will help you get started
        // you can tweak the parameters here if you want, I've played around with them prior to this
        // and these seem to work well for the nodes/links that we have
        force.nodes(data.characters.concat(data.houses))
        // specify the links that connect the nodes in our network (characters are connected to each other OR to their house)
            .links(data.books[sBook].links.concat(data.houseLinks))
            .size([width - margin*2, height - margin*2])
            .linkStrength(0.05)
            .friction(0.9)
            .linkDistance(90)
            .charge(-60)
            .gravity(0.01)
            .theta(0.8)
            .alpha(0.1)
            .start();

        // I'll add the house nodes for you so you have a place to start
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

        // draw and append links here, remember select, enter, exit - need to update the links based on the sBook index 0..6
        // data.books[sBook]links contains all of the character links

        // if you get the append and remove functions working for links, maybe try adding transitions so you can see which nodes are leaving/entering networks

        
        // draw and append the nodes here, this time you only need a select and enter - only need to add nodes initially and then resize them based on
        // number of links in the currently selected book
        // data.characters contains all of the characters in all of the books


        // hint if you use the pattern fill you have to first group the circle, otherwise the pattern will not move with the circle


        // call the update fonce.on('tick', function(){}) here that will update your selections (enter,exit,select) for each step of the force directed layout
        // the force directed layout will update each node for its x and y location - the links and nodes need to reflect these changes

    };

    // write a highlight function here to highlight a node and its links when hovering over the node
    function highlightNode(n){
        // usually you hide other nodes and links by changing the opacity of all links and nodes
        // hint you can select all nodes if you class them as 'node' by using jquery $('.node') - that selects all nodes in visualization

        // then turn back up the opacity for the hovered node and maybe its linked nodes
        // hint: n is the data value that is being hovered over - the character with a list of its links
    }

    // write a function here to remove your selection, basically you just need to turn back up the opacity again
    function deselectNode(n){
        
    }

    // don't worry about this code - I'm updating the slider for the books, all you need to know here is that I'm defining to indices for the visualization
    // sBook = the currently selected Book
    // pBook = the previously selected Book
    main.bookSelected = function(event, ui) {
        pBook = sBook;
        sBook = ui.value;
        bSliderHandle.qtip('option', 'content.text', '<img src=\"' + BOOK_COVERS[sBook] +'\" width=\"40px\" height=\"72px\"/>');
        main.draw();
    };

    // don't worry about this either - this code updates the size of the svg whenever the window resizes
    // I call main.draw() here so you should handle resizes in the main.draw function
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
