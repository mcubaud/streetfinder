var lieu = "Rennes";
console.log(lieu);
///affichage de la carte
if(lieu == "Lyon"){
    var mymap = L.map('mapid').setView([45.75728373443727, 4.849433898925782], 13);
}
if(lieu == "Rennes"){
    var mymap = L.map('mapid').setView([48.11105621460431, -1.676739113603782], 13);
}

layer=L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
  attribution: 'Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
}).addTo(mymap);


var json_balades={};

var promise0 = new Promise((resolve, reject) => {
    if(lieu == "Lyon"){
        var geojson = "rues.geojson";
    }
    if(lieu == "Rennes"){
        var geojson = "rues_rennes.geojson";
    }
    fetch(geojson)
    .then(r => r.json())
    .then(r => {
        json_balades = r;
        promise = new Promise((resolve, reject) => {
            resolve(json_balades);
        });
        resolve(r);
    })
});
var promise = promise0;
var total_length = 0;
var find_length = 0;


polylines = {};
names = {};
trouves = {};
trouves_uniques = [];
promise
.then(r => {
    var array = r.features
    for(var i=0; i<array.length;i++){
        var obj = array[i];
	if(lieu == "Lyon"){
            lnglats = obj.geometry.coordinates;
	    latlngs = lnglats.map(x => [x[1],x[0]])
	}
	if(lieu == "Rennes"){
	    latlngs = obj.geometry.coordinates;
    	}
        try{
            var polyline = L.polyline(latlngs, {color: '#3b364b'}).addTo(mymap);
            /*polyline.bindPopup(`
            <H3>${obj.properties.name}</H3>
            <p>${obj.properties.Date}</p>
            <p>${obj.properties.Longueur}</p>
            `)*/
		polyline.nom = obj.properties.name;
		polyline.length = obj.properties.length;
		total_length += polyline.length;
		polylines[i] = polyline
		names[i] = obj.properties.name;
		trouves[i] = false;
		console.log(polyline);
        }finally{
			
        }
        
    }
	print_score()
})


function print_score(){
	document.getElementById("score").innerHTML = Math.round(find_length/1000)+ " / "+Math.round(total_length/1000)+" km ("+Math.round(100*find_length/total_length)+"%) des rues trouvées";
	document.getElementById("score").style["color"] = couleur_par_score(find_length/total_length);
	document.getElementById("file").value = Math.round(100*find_length/total_length);
}


/*

//Récupération des objets sur le serveur
var requestURL = 'balades.geojson';
var request = new XMLHttpRequest();
request.open('GET', requestURL);
request.responseType = 'json';
request.send();
request.onload = function() {
    balades = request.response;
    GeoJsonLayer.addData(balades);
}*/

// Géocodage inverse

var inputVille = document.getElementById('inputAdresse')
inputVille.addEventListener('focusout', function(event) {
    chercher();  
});

inputVille.addEventListener('keydown', (e) => {
    if (e.keyCode==13){
        chercher();
    }
});

document.getElementById("btn-recherche").onclick=chercher();


function chercher(){
    var adresse = $("#inputAdresse").val();
    console.log(adresse);
    if(adresse != ""){
		any_ok = false;
		for(let i in polylines){
            name2 = names[i];
			if(!trouves[i] & are_similar(adresse, name2)){
				polylines[i].setStyle({"color":"green"});
				polylines[i].bindTooltip(name2);
				any_ok = true;
				find_length += polylines[i].length;
				trouves[i] = true;
				if (!trouves_uniques.includes(name2)){
					document.getElementById("list_found").innerHTML+="<li>"+name2+"</li>";
					trouves_uniques.push(name2);
					console.log(name2);
				}
			}
		}
		if(any_ok){
			document.getElementById("inputAdresse").value="";
			print_score();
			inputAdresse.style["animation"]="";
			inputAdresse.style["animation"]="clignoter_vert 500ms linear";
			setTimeout(x=>{inputAdresse.style["animation"]="";},1000);
		}else{
			inputAdresse.style["animation"]="";
			inputAdresse.style["animation"]="secouer_petit 1s linear";
			setTimeout(x=>{inputAdresse.style["animation"]="";},1000);
		}
    }
}

function standardize(str){
	str =  str.toLowerCase().replace("-"," ").replace("œ","oe");
	var lettres_accentuees = "àäâéèêëîïôöùüû".split("");
	var lettres_normales =   "aaaeeeeiioouuu".split("");
	for(let i=0; i<lettres_normales.length; i++){
		str = str.replace(lettres_accentuees[i], lettres_normales[i]);
	}
	return str
}

function are_similar(nom1, nom2){
	var exact_match = nom1.toLowerCase().replace("-"," ")==nom2.toLowerCase().replace("-"," ");
	var regex_rues = /rue |avenue |boulevard |cours |place |impasse |allée |ruelle |passage |pont |montée |quai |tunnel |grande rue |montee |allee /g;
	var regex_stop_words = /le |la |l' |les |de |du |des |d' |un |une |l |d /g;
	const commonFirstNames = ['John', 'Michael', 'Alice'];

	// Construct the regex pattern to match first names followed by last names
	const regexPattern = new RegExp(`\\b(${commonFirstNames.join('|')})\\s+([A-Z][a-z]+)\\s+`, 'ig');

	var partial_match = standardize(nom1).replace(regex_stop_words,"")==standardize(nom2).replace(regex_stop_words,"").replace(regex_rues,"");
	return exact_match | partial_match;
	}

function Reverse_chercher(lat,lon,reponse){
    $.ajax({
        url: "https://nominatim.openstreetmap.org/reverse", // URL de Nominatim
        type: 'get', // Requête de type GET
        data: "lat="+lat+"&lon="+lon+"&format=json&zoom=12&addressdetails=1" // Données envoyées (lat, lon -> positions, format -> format attendu pour la réponse, zoom -> niveau de détail)
    }).done(function (response) {
        if(response != ""){
            console.log(response)
            reponse=response
        }                
    }).fail(function (error) {
        console.log(error);
        console.log("fail")
    });      
}

/*
document.getElementById("Quitter").addEventListener("click",e=>{
    window.location.href="..";
});
*/

function componentToHex(c) {
    let hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }
  function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }
function hexToRgb(hex){
    var r=parseInt(hex.slice(1,3),16);
    var g=parseInt(hex.slice(3,5),16);
    var b=parseInt(hex.slice(5,7),16);
    return [r,g,b]
}
function couleur_par_score(pts){
    return rgbToHex(Math.floor(255-255*pts),Math.floor(255*pts),0);
}

/*document.getElementById("localize").onclick=function(){
    mymap.locate({setView: true, maxZoom: 16});
}*/

function onLocationFound(e) {
    var radius = e.accuracy;

    L.marker(e.latlng).addTo(mymap)
        .bindPopup("You are within " + radius + " meters from this point").openPopup();

    L.circle(e.latlng, radius).addTo(mymap);
}

mymap.on('locationfound', onLocationFound);

function onLocationError(e) {
    alert(e.message);
}

mymap.on('locationerror', onLocationError);
