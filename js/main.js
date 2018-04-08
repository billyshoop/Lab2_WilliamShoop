/* Authored by Bill Shoop, 2018 */
//wrap everything in a self-executing anonymous function
(function(){
    
    //pseudo-global variables
    //variables for data join
    var attrArray = ["civLaborForce","employed","unemployed","unemployedRate","population"]; //list of attributes
    var expressed = attrArray[0]; //initial attributes

//begin script when window loads    
    window.onload = setMap();
    
//set up choropleth map 
    function setMap(){
        
        //map frame dimensions
        var width = 960,
            height = 460;
        
        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class","map")
            .attr("width",width)
            .attr("height",height);
        
        //create Albers equal area conic projection centered on Maine
        var projection = d3.geoAlbers()
            .center([0,45.2538])
            .rotate([69.4,0,0])
            .parallels([17,45])
            .scale(4000)
            .translate([width / 2, height /2]);
    
        var path = d3.geoPath()
            .projection(projection) 
        
        //use queue to parallelize asynchronous data loading
        d3.queue()
            .defer(d3.csv, "data/2015MaineCtyEmploymentRates.csv")// load attributes from csv
            .defer(d3.json, "data/MaineBoundariesReproject.topojson")//load choropleth spatial data
            .defer(d3.json, "data/usStates.topojson")//load background spatial data
            .await(callback);
        
        function callback(error, csvData, maine, us){
            
            //place graticule on the map
            setGraticule(map,path);

            //translate maine and us states TopoJSONs
            var maineCounties = topojson.feature(maine, maine.objects.MaineBoundariesReproject);
            var usstates = topojson.feature(us, us.objects.usStates);
        
            //add us states to map
            var states = map.append("path")
                .datum(usstates)
                .attr("class","state")
                .attr("d", path);
            
            //join csv data to GeoJSON enumeration units
            maineCounties = joinData(maineCounties, csvData);
        
            //create the color scale
            var colorScale = makeColorScale(csvData);
        
            //add enumeration units to the map
            setEnumerationUnits(maineCounties, map, path, colorScale);
        };
    };//end of setMap()
    
    function setGraticule(map,path){
        
        //create graticule generator
        var graticule = d3.geoGraticule()
            .step([5,5]);//place graticule lines every 5 degrees of long and lat
        
        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline())//bind graticule background
            .attr("class","gratBackground")//assign class for styling
            .attr("d",path)//project graticule
        
        //create graticule lines
        var gratLines = map.selectAll(".gratLines")//select graticule elements that will be created
            .data(graticule.lines())//bind graticule lines to each element to be created
            .enter()// create an elememt for each datum
            .append("path")//append each element to the svg as a path element
            .attr("class","gratLines")//assign class for styling
            .attr("d",path);//project grat lines

    };
    
    function joinData(maineCounties, csvData){
        
        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csvData.length; i++){
            var csvCounty = csvData[i]; //the current region
            var csvKey = csvCounty.joinID; //the CSV primary key
            
            //loop through geojson regions to find correct region
            for (var a=0; a<maineCounties.length; a++){
                
                var geojsonProps = maineCounties[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.joinID; //the geojson primary key
                
                //where primary keys match, transfer csv data to geojson proprties object
                if (geojsonKey == csvKey){
                    
                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvCounty[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties 
                    })
                }
            }
        }
       return maineCounties;
    };
    
    function setEnumerationUnits(maineCounties, map, path, colorScale){
        
        //add maine counties to map
        var regions = map.selectAll(".regions")
            .data(maineCounties)
            .enter()
            .append("path")
            .attr("class",function(d){
                return "regions " + d.properties.joinID;
            })
            .attr("d",path)
            .style("fill", function(d){
                return colorScale(d.properties[expressed]);
            });
    };
    
    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses =[
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"
        ];
        
        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);
        
        //build array of all values of the expressed attributes 
        var domainArray=[];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };
        
        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);
        
        return colorScale;
    };
})();