/*globals define*/
define( ["jquery", "text!./css/style.css", "js/qlik", "./vendor/d3.v3.min", "./js/themes"], function ( $, cssContent, qlik ) {
	'use strict';
	$( "<style>" ).html( cssContent ).appendTo( "head" );
	return {
		initialProperties: {
			qHyperCubeDef: {
				qDimensions: [],
				qMeasures: [],
				qInitialDataFetch: [{
					qWidth: 11,
					qHeight: 900
				}]
			}
		},
		definition: {
			type: "items",
			component: "accordion",
			items: {
				dimensions: {
					uses: "dimensions",
					min: 2,
					max: 2
				},
				measures: {
					uses: "measures",
					min: 2,
					max: 2
				},
				sorting: {
					uses: "sorting"
				},
				settings: {
					uses: "settings",
					items:{
						ThemeDropDown: {
							type: "string",
							component: "dropdown",
							label: "Theme",
							ref: "theme",
							options: chart_theme,
							defaultValue: 1
						},
					MyColorPicker: {
							label:"My color-picker",
							component: "color-picker",
							ref: "myColor",
							type: "integer",
							defaultValue: 3
						},	
					  extras:{
							type: "items",
							label: "Extra Settings",
							items: {
								scrollaftermax: {
									type: "integer",
									label: "Circle size (px)",
									ref: "circleSize",
									defaultValue: 4
								},
								showfulltitles: {
									type: "boolean",
									label: "Show minimal titles",
									ref: "minimaltitles",
									defaultValue: true
								},
								showlegend: {
									type: "boolean",
									label: "Show legend",
									ref: "showlegend",
									defaultValue: true
								}							
							}
						}					
					}
				}
			}
		},
		snapshot: {
			canTakeSnapshot: true
		},
		paint: function ( $element, layout ) {
			
			var qMatrix = layout.qHyperCube.qDataPages[0].qMatrix;
			
			var measureLabels = layout.qHyperCube.qMeasureInfo.map(function(d)
			{
			return d.qFallbackTitle;
			}
			);
			
			var measureLength = layout.qHyperCube.qMeasureInfo.length;
			
			var dimLabel = layout.qHyperCube.qDimensionInfo[1].qFallbackTitle;
			
			var data = qMatrix.map(function(d) {
				var i;
				var mydata = {};
				mydata["Dim0"] = d[0].qText;
				mydata["Dim1"] = d[1].qText;				
				for	(i = 2; i < d.length; i++) {mydata["Metric" + (i - 2)] = d[i].qNum;}
				return mydata;			

			});
			
			var width = $element.width();
			var height = $element.height();
			var id = "container_" + layout.qInfo.qId;
			console.log(id);
			
			if(document.getElementById(id)) {
			$("#" + id).empty();
			}
			else {
			$element.append($('<div />').attr("id", id).width(width).height(height));
			}
			
			viz(data, measureLabels, dimLabel, width, height, id, layout, qlik);
			
		}
	};
} );

var viz = function(data, labels, dim, width, height, id, layout, qlik) {

var app = qlik.currApp();

//////////////////////////////////////////////////////////////////////////////////////////////////

//Set values for presentation
var margin = {top: 20, right: 20, bottom: 100, left: 40};

var mainDimension = [];
var secondaryDimension = [];
var stgData;
var formattedData = [];
var maxValue = 0.0;

for(var i = 0; i < data.length; i++){
	  
	if(mainDimension.indexOf(data[i].Dim0) < 0){
	  mainDimension.push(data[i].Dim0);
	  stgData = { "mainDimension" : data[i].Dim0, "dataMainDimension" : [] };
	  formattedData.push(stgData);
	}
	if(secondaryDimension.indexOf(data[i].Dim1) < 0){
	secondaryDimension.push(data[i].Dim1);
	}

	stgData = {"secondaryDimension" : data[i].Dim1, "measure" : data[i].Metric0};
	var temp = mainDimension.indexOf(data[i].Dim0);
	formattedData[temp].dataMainDimension.push(stgData);
	if(maxValue < data[i].Metric0){
	maxValue = data[i].Metric0;
	}
}

formattedData.forEach(function(d){
	d.mean = d3.mean(d.dataMainDimension, function(d) { return d.measure; });
})

console.log(formattedData);

var w = width - margin.right - margin.left;
var h = height - margin.top - margin.bottom;

var x = d3.scale.ordinal()
	.rangeBands([10, w - margin.right + mainDimension.length], .15)
	.domain(mainDimension);
var intraDayX = d3.scale.linear()
	.range([0, x.rangeBand()]);
var y = d3.scale.linear()
	.nice()
	.range([h-20, 0]);
var xAxis = d3.svg.axis()
	.scale(x)
	.orient("bottom")
	.tickSize(0);
var yAxis = d3.svg.axis()
	.scale(y)
	.orient("left")
	.tickFormat(d3.format("s"));
var yAxis2 = d3.svg.axis()
	.scale(y)
	.orient("left")
	.tickFormat(d3.format("s"))
	.tickSize(w);
var line = d3.svg.line()
	.x(function(d, i) { return intraDayX(i); })
	.y(function(d,i) { return y(d.measure) + margin.top });
var secondaryScale = d3.scale.ordinal()
	.domain(secondaryDimension)
	.rangePoints([0, x.rangeBand()]);
var secondaryNamesAxis = d3.svg.axis()
	.scale(secondaryScale)
	.orient("bottom");
		
var chart = d3.select("#" + id)
                .append("svg")
                .attr("width", w )
                .attr("height", h + 40 )
				.attr("transform", "translate( " + margin.left +" ," + margin.top + ")");
				
intraDayX.domain([0, secondaryDimension.length-1]);
		y.domain([0, maxValue]);
		
		var namesAxisD = chart.append("g")
					.attr("transform", "translate( " + margin.left +" ," + (h + 30) + ")")
					.attr("class", "xaxis")
					.call(xAxis);
		
		var valuesAxisD = chart.append("g")
					.attr("transform", "translate( " + margin.left +" ," + margin.top + ")")
					.attr("class", "axis")
					.call(yAxis);
					
		var valuesAxisD2 = chart.append("g")
					.attr("transform", "translate( " + (margin.left + w) +" ," + margin.top + ")")
					.attr("class", "yAxisDot")
					.call(yAxis2);
					
		var main = chart.selectAll(".main")
            .data(formattedData)
            .enter()
            .append("g")
            .attr("class", "main")
            .attr("transform", function(d, i) { console.log(x(mainDimension[i]));return "translate(" + (x(mainDimension[i]) + margin.left) + ",0)"; });
		
		main.append("line")
            .attr("class", "mean")
			.attr("stroke", palette[layout.myColor])
            .attr("x1", 0)
            .attr("y1", function(d) { return y(d.mean) + margin.top; })
            .attr("x2", x.rangeBand())
            .attr("y2", function(d) { return y(d.mean) + margin.top; });
			
		main.append("path")
            .datum( function(d) {console.log("soy" + d.dataMainDimension); return d.dataMainDimension; })
            .attr("class", "line")
			.attr("stroke", palette[layout.myColor])
            .attr("d", line);
		main.append("g")
			.attr("transform", "translate( 0 ," + (h) + ")")
			.attr("class", "axis")
			.call(secondaryNamesAxis)
			.selectAll("text")
			.attr("transform", function(d, i){return "translate(" + (mainDimension[i].length * -2.5) + "," + (mainDimension[i].length * 2.0) +")rotate(320)"});
		
		valuesAxisD2.selectAll("g").filter(function(d) { return d; })
					.classed("minor", true);

///////////////////////////////////////////////////////////////////////////////////////////////////
/*
var domainByTrait = {},
     traits = d3.keys(data[0]).filter(function(d) { return d !== "Dim1" && d !== "Dim0"; }),
     n = traits.length;
	 
	 //console.log(data);
	 //console.log(traits);

 traits.forEach(function(trait) {
   domainByTrait[trait] = d3.extent(data, function(d) { return d[trait]; });
 });
 
 //console.log(domainByTrait);
 
 
 var width =  Math.min(width, height),//if(width<height) {return width;} else {return height;},
    size = (Math.min(width, height)-40)/n,
    padding = 20;

var x = d3.scale.linear()
    .range([padding / 2, size - padding / 2]);

var y = d3.scale.linear()
    .range([size - padding / 2, padding / 2]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .ticks(6);

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(6);

var color = d3.scale.ordinal()
			.range(layout.theme); //category20();
 
  //var size = width / n;
 
  xAxis.tickSize(size * n);
  yAxis.tickSize(-size * n);

  var svg = d3.select("#" + id).append("svg")
      .attr("width", size * n + padding)
      .attr("height", size * n + padding)
    .append("g")
      .attr("transform", "translate(" + padding + "," + padding / 2 + ")");

  svg.selectAll(".x.axis")
      .data(traits)
    .enter().append("g")
      .attr("class", "x axis")
      .attr("transform", function(d, i) { return "translate(" + (n - i - 1) * size + ",0)"; })
      .each(function(d) { x.domain(domainByTrait[d]); d3.select(this).call(xAxis); });

  svg.selectAll(".y.axis")
      .data(traits)
    .enter().append("g")
      .attr("class", "y axis")
      .attr("transform", function(d, i) { return "translate(0," + i * size + ")"; })
      .each(function(d) { y.domain(domainByTrait[d]); d3.select(this).call(yAxis); });

  var cell = svg.selectAll(".cell")
      .data(cross(traits, traits))
    .enter().append("g")
      .attr("class", "cell")
      .attr("transform", function(d) { return "translate(" + (n - d.i - 1) * size + "," + d.j * size + ")"; })
      .each(plot);

  // Titles for the diagonal.
  cell.filter(function(d) { if(layout.minimaltitles) {return d.i === d.j;} else {return 1 === 1};}).append("text")
      .attr("x", padding)
      .attr("y", padding)
      .attr("dy", ".71em")
      .text(function(d) { if(layout.minimaltitles) {return labels[d.i];} else {return labels[d.i] + " vs. " + labels[d.j];}});



  function plot(p) {
    var cell = d3.select(this);

    x.domain(domainByTrait[p.x]);
    y.domain(domainByTrait[p.y]);

    cell.append("rect")
        .attr("class", "frame")
        .attr("x", padding / 2)
        .attr("y", padding / 2)
        .attr("width", size - padding)
        .attr("height", size - padding);

    cell.selectAll("circle")
        .data(data)
      .enter().append("circle")
        .attr("cx", function(d) { return x(d[p.x]); })
        .attr("cy", function(d) { return y(d[p.y]); })
        .attr("r", layout.circleSize)
		.attr("class", "visible")
        .style("fill", function(d) { return color(d.Dim1); })
		.on("mouseover", function(d, i) { console.log(labels);})
		.append("svg:title")
			.text(function(d) {return d.Dim0;});		

  }
  
	//Trying to figure out the popups
	// svg.selectAll("circle")
		// .on("mouseover", function(d, i) { console.log(labels);})
		// .append("svg:title")
			// .text(function(d) {return d.Dim0;});

  //Legend
if(layout.showlegend) {  

	svg.append("rect")
		.attr("x", width-135)
		.attr("y", -3)
		.attr("width", 103)
		.attr("height", 20 * color.domain().length + 4)
		.style("fill", "white")
		.style("paddingTop", "5px")
		.style("stroke-width", 2)
		.style("stroke", "black")
		.style("stroke-opacity", 0.7);

  var legend = svg.selectAll(".legend")
      .data(color.domain())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  legend.append("rect")
      .attr("x", width - 52)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color);

  legend.append("text")
      .attr("x", width - 58)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });
} 
  // end Legend

  d3.select(self.frameElement).style("height", size * n + padding + 20 + "px");


function cross(a, b) {
  var c = [], n = a.length, m = b.length, i, j;
  for (i = -1; ++i < n;) for (j = -1; ++j < m;) c.push({x: a[i], i: i, y: b[j], j: j});
  return c;
}
*/
};
