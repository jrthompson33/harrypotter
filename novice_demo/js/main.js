/**
 * Created by John Thompson
 */

(function(){
    // The global objects for the visualization
    main = {};
    data = {};

    // probably don't need to worry about any of these vars
    var chart, height, width, chartDimens;

    // the variable that we'll point to the d3 selection of the svg that we'll append to
    var svg;

    // the maxcount of links
    var maxCount = 0;

    // the colors of each book for the chart
    var BOOK_COLORS = {'sorcerers_stone': '#FFE246', 'chamber_of_secrets': '#CB3665', 'prisoner_of_askaban': '#CE8498',
        'goblet_of_fire': '#75A770', 'order_of_phoenix': '#098CC1', 'half_blood_prince': '#DDE86B'};

    // the location of the images for the covers of each book
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
        chartDimens = {height: height, width: width};
        // Append the svg that we'll use to draw the div
        // we'll be adding everything to this svg variable
        chart.selectAll("svg").data([chartDimens], function(d){return 'chart';}).enter().append("svg");
        svg = chart.select("svg");
        svg.attr("height", function(d) {return d.height;})
            .attr("width", function(d) {return d.width;});

        // Load the data after we've set up the vis
        main.loadData(params);
    };

    main.loadData = function(params) {
        // Load data for the visualization here
        d3.json(params.datapath, function(raw){
            data.books = clone(raw[0].books);

            // mapping the books to the number of links that occur
            // also mapping within each book the number of links within each house or interhouse
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
                b.houses = d3.nest()
                    .key(function(d){
                        return houseMap[d.source] == houseMap[d.target] ? houseMap[d.source] : 'InterHouse';
                    })
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

        // constants for bar chart
        var barWidth = 40;
        var imgHeight = 75, imgWidth = 48;

        // y scale that we use, maxCount is the maximum number of support links
        var yScale = d3.scale.linear()
            .domain([0, maxCount])
            .range([height/2,0]);

        // x scale that we use - it is an ordinal, so we can plug in the book class name and get out where the x location of the bar should be
        var xScale = d3.scale.ordinal()
            .domain(["sorcerers_stone","chamber_of_secrets", "prisoner_of_askaban","goblet_of_fire","order_of_phoenix","half_blood_prince"])
            .rangeRoundBands([0, width/2],1);

        // append the data to the svg by adding rects
        
        // first call your selection from svg.selectAll on the class that defines each bar in the bar chart
        
        // next join the data to those elements using the data() call

        // call enter to select all data that does not have a __data__ element bound

        // append a rect for each book within the data and modify the height using the linkcount
        // hint: each attr or style can be generated by a callback on the joined data using function(d){} - d is the book in this case

        // NEXT: specify axises for your chart using the d3.svg.axis() call
        // hint: also need to add to style the axis you append

        // NEXT: try making a stacked bar chart!
        // within your book selections you make another data selection
        // and append the list of houses so you can show what houses had which linked values

        // NEXT: try changing the classname that appears on the x axis to the name of the book


        // NEXT: try changing the title of the book to an image of the book
        // hint:the image paths are found in the BOOK_COVERS array BOOK_COVERS[0] gives you the sorcer's stone cover

        // NEXT: update your visualization as the window changes sizes
        // hint: use the height and width variables that define the svg size to update your vis dimensions

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
