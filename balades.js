var lieu = localStorage.getItem("lieu");

if( lieu === null){
    lieu = "Rennes";
}

console.log(lieu);
///Changer le nom de la page
document.getElementById("titre").children[0].innerHTML += lieu;
document.title += " "+lieu;
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
        lnglats = obj.geometry.coordinates;
	latlngs = lnglats.map(x => [x[1],x[0]]);
	
        try{
            var polyline = L.polyline(latlngs, {color: '#3b364b'}).addTo(mymap);
            /*polyline.bindPopup(`
            <H3>${obj.properties.name}</H3>
            <p>${obj.properties.Date}</p>
            <p>${obj.properties.Longueur}</p>
            `)*/
            polyline.nom = obj.properties.name;
            other_tags = obj.properties.other_tags;
            if (other_tags && other_tags.includes("\"wikipedia\"=>\"")){
                try{
                    polyline.wiki = other_tags.split("\"wikipedia\"=>\"")[1].split("\"")[0];
                    console.log(polyline.wiki);
                }finally{}
            }
            polyline.length = obj.properties.length;
            total_length += polyline.length;
            polylines[i] = polyline
            names[i] = obj.properties.name;
            trouves[i] = false;
        }finally{
			
        }
        
    }
    print_score();
	
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


function openTooltip(truc){
    truc.openTooltip()
}

function chercher(){
    var adresse = $("#inputAdresse").val();
    console.log(adresse);
    if(adresse != ""){
		any_ok = false;
        any_already = false;
		for(let i in polylines){
            name2 = names[i];
			if(are_similar(adresse, name2)){
                if(trouves[i]){
                    any_already = true;
                    last_already = polylines[i]
                }
                else{
                    polylines[i].setStyle({"color":"green"});
                    polylines[i].bindTooltip(name2);
                    if(polylines[i].wiki){
                        [langue, page]= polylines[i].wiki.split(":");
                        polylines[i].bindPopup(
                            "<iframe style='height:400px;' src='https://"+langue+".m.wikipedia.org/wiki/"+page+"'></iframe>"
                        )
                    }
                    any_ok = true;
                    find_length += polylines[i].length;
                    trouves[i] = true;
                    if (!trouves_uniques.includes(name2)){
                        var name_std = standardize(name2).replaceAll("' ","_").replaceAll(" ","_")
                        document.getElementById("list_found").innerHTML+="<li id='list_found_"+name_std+"'>"+name2+"</li>";
                        let thispolyline = polylines[i]
                        document.getElementById("list_found_"+name_std).onclick=function(){
                            console.log(name2);
                            thispolyline.openTooltip();
                        }
                        trouves_uniques.push(name2);
                        console.log(name2);
                    }
                }
				
			}
		}
		if(any_ok){
			document.getElementById("inputAdresse").value="";
			print_score();
			inputAdresse.style["animation"]="";
			inputAdresse.style["animation"]="clignoter_vert 500ms linear";
			setTimeout(x=>{inputAdresse.style["animation"]="";},1000);
		}else if(any_already){
            last_already.openPopup();
            mymap.flyToBounds(last_already.getBounds());
            inputAdresse.style["animation"]="";
			inputAdresse.style["animation"]="secouer_petit_orange 1s linear";
			setTimeout(x=>{inputAdresse.style["animation"]="";},1000);
        }else{
			inputAdresse.style["animation"]="";
			inputAdresse.style["animation"]="secouer_petit 1s linear";
			setTimeout(x=>{inputAdresse.style["animation"]="";},1000);
		}
    }
}

function standardize(str){
	str =  str.toLowerCase().replaceAll("-"," ").replaceAll("œ","oe").replaceAll("'","' ");
	var lettres_accentuees = "àäâéèêëîïôöùüû".split("");
	var lettres_normales =   "aaaeeeeiioouuu".split("");
	for(let i=0; i<lettres_normales.length; i++){
		str = str.replaceAll(lettres_accentuees[i], lettres_normales[i]);
	}
	return str
}

function are_similar(nom1, nom2){
	var exact_match = standardize(nom1)==standardize(nom2);
	var regex_rues = /rue |avenue |boulevard |cours |place |impasse |allée |ruelle |passage |pont |montée |quai |tunnel |grande rue |montee |allee |bretelle |mail |cite |anse |carrefour |chaussee |chemin |clos |cote |cour |cours |degre |descente |dreve |escoussiere |esplanade |gaffe |grand route |liaison |placette |promenade |residence |rang |rampe |rond point |route |ruelle |sente |sentier |square |traverse |venelle |voie |berge |digue /g;
	var regex_stop_words = /le |la |l' |les |de |du |des |d' |un |une |l |d /g;
	const commonFirstNames = ['John', 'Michael', 'Alice'];

	// Construct the regex pattern to match first names followed by last names
	const regexPattern = new RegExp(`\\b(${commonFirstNames.join('|')})\\s+([A-Z][a-z]+)\\s+`, 'ig');

	var partial_match = standardize(nom1).replaceAll(regex_stop_words,"")==standardize(nom2).replaceAll(regex_rues,"").replaceAll(regex_stop_words,"");
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

function downloadObjectAsJson(exportObj, exportName){
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

document.getElementById("save").onclick = function(){
    downloadObjectAsJson(trouves, "streetfinder_save_"+lieu);
}

function upload_save(saved_trouvees){
    for(let i in polylines){
        name2 = names[i];
        if(saved_trouvees[i]){
            polylines[i].setStyle({"color":"green"});
            polylines[i].bindTooltip(name2);
            if(polylines[i].wiki){
                [langue, page]= polylines[i].wiki.split(":");
                polylines[i].bindPopup(
                    "<iframe style='height:400px;' src='https://"+langue+".m.wikipedia.org/wiki/"+page+"'></iframe>"
                )
            }
            any_ok = true;
            if (!trouves[i]){
                find_length += polylines[i].length;
                trouves[i] = true;
            }
            if (!trouves_uniques.includes(name2)){
                var name_std = standardize(name2).replaceAll("' ","_").replaceAll(" ","_")
                document.getElementById("list_found").innerHTML+="<li id='list_found_"+name_std+"'>"+name2+"</li>";
                let thispolyline = polylines[i]
                document.getElementById("list_found_"+name_std).onclick=function(){
                    console.log(name2);
                    thispolyline.openTooltip();
                }
                trouves_uniques.push(name2);
                console.log(name2);
            }
        }
    }
}

document.getElementById("upload").onchange = function(){
    file = document.getElementById("upload").files[0];
    urlfile = URL.createObjectURL(file);
    fetch(urlfile)
    .then(r=>r.json())
    .then(r=>upload_save(r))
}