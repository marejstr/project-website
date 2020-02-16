// Referenced from multiple functions
var map;
var routesJson;

var routeSource = new ol.source.Vector({
    features: []
});

var pointSource = new ol.source.Vector({
    features: []
});

// fetch routes when script is loaded
fetchRoutes()
loadMap()

// Event listeners
document.getElementById('showBusesButton').addEventListener("click", drawBusLocations)
document.getElementById('refreshButton').addEventListener("click", drawBusLocations)
document.getElementById('showRouteButton').addEventListener("click", drawRoute)

async function fetchRoutes() {
    // Get response from api and get json from response
    const response = await fetch('https://data.foli.fi/gtfs/routes');
    routesJson = await response.json();

    var buslinesDropdown = document.getElementById('buslinesDropdown');

    // Populate dropdown
    for (var i = 0; i < routesJson.length; i++) {
        var route = routesJson[i];
        buslinesDropdown.add(new Option(route.route_short_name + " - " + route.route_long_name));
    }
}

// Create map and place in map div
async function loadMap() {
    var baseLayer = new ol.layer.Tile({
        source: new ol.source.OSM()
    });

    // Create a layer for the routes
    var routeLayer = new ol.layer.Vector({
        source: routeSource,
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: [0, 0, 255, 1],
                width: 2
            })
        })
    });

    // Create a layer for the bus markers
    var pointLayer = new ol.layer.Vector({
        source: pointSource,
        style: new ol.style.Style({
            image: new ol.style.Icon({
                src: 'img/bus.svg',
            })
        })
    });

    map = new ol.Map({
        target: 'map',
        layers: [baseLayer, routeLayer, pointLayer],
        view: new ol.View({
            center: ol.proj.fromLonLat([22.27, 60.45]),
            zoom: 10
        })
    });
}

// Draw point on map for every bus on selected line.
async function drawBusLocations() {
    // Get route short name for selected route
    var buslinesDropdown = document.getElementById('buslinesDropdown');
    var selectedIndex = buslinesDropdown.selectedIndex;
    var shortName = routesJson[selectedIndex].route_short_name

    // Get response from api and get json from response
    const response = await fetch('https://data.foli.fi/siri/vm');
    var bussesJson = await response.json();
    var vehiclesJson = bussesJson.result.vehicles

    var points = new Array();
    // Create array of points as features
    for (i in vehiclesJson) {
        if (vehiclesJson[i].publishedlinename == shortName) {
            var lon = vehiclesJson[i].longitude
            var lat = vehiclesJson[i].latitude

            var point = new ol.Feature({
                geometry: new ol.geom.Point(
                    ol.proj.fromLonLat([lon, lat])
                ),
            });

            points.push(point);
        }
    }

    // Add feature array to vector layer of map
    pointSource.clear()
    routeSource.clear()
    pointSource.addFeatures(points)

}

// Draw line on map for selected route.
// Every route has different shapes. The most common shape is chosen to be drawn
async function drawRoute() {
    // Get route id from json for selected route
    var buslinesDropdown = document.getElementById('buslinesDropdown');
    var selectedIndex = buslinesDropdown.selectedIndex;
    var routeId = routesJson[selectedIndex].route_id

    // Get response from api and get json from response
    const routeresponse = await fetch('https://data.foli.fi/gtfs/trips/route/' + routeId);
    var tripsJson = await routeresponse.json();

    // Create object for route shape with count of how many times that shape
    // is found in json
    shapeCount = {};
    for (var i = 0; i < tripsJson.length; i++) {
        if (!shapeCount[tripsJson[i].shape_id]) {
            shapeCount[tripsJson[i].shape_id] = 0;
        }
        shapeCount[tripsJson[i].shape_id]++
    }

    // Find most common shape in shapeCount
    const entries = Object.entries(shapeCount)
    var mostCommonShape;
    var maxCount = 0;
    for (const [shape, count] of entries) {
        if (Number(count) > maxCount) {
            mostCommonShape = shape;
            maxCount = Number(count)
        }
    }

    // Get path for the most common shape as longitude, latitude points
    // and add lines to map between path points
    const response = await fetch('https://data.foli.fi/gtfs/shapes/' + mostCommonShape);
    var lonlatJson = await response.json();

    var lines = new Array();
    var lon;
    var lat;
    var lastlon;
    var lastlat;

    for (var i = 0; i < lonlatJson.length; i++) {
        lon = lonlatJson[i].lon;
        lat = lonlatJson[i].lat;

        if (i > 0) {
            var line = new ol.Feature({
                geometry: new ol.geom.LineString(
                    [ol.proj.fromLonLat([lastlon, lastlat]), ol.proj.fromLonLat([lon, lat])]
                ),
            });

            lines.push(line);
        }

        lastlon = lon;
        lastlat = lat
    }

    routeSource.clear()
    pointSource.clear()
    routeSource.addFeatures(lines)
}