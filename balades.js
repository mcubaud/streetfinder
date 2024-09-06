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
                        add_in_list_found(name2, polylines[i]);
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
	var lettres_accentuees = "àäâéèêëîïôöùüûÿ".split("");
	var lettres_normales =   "aaaeeeeiioouuuy".split("");
	for(let i=0; i<lettres_normales.length; i++){
		str = str.replaceAll(lettres_accentuees[i], lettres_normales[i]);
	}
	return str
}

function are_similar(nom1, nom2){
	var exact_match = standardize(nom1)==standardize(nom2);
	var regex_rues = /\brue |\bavenue |\bboulevard |\bcours |\bplace |\bimpasse |\ballée |\bruelle |\bpassage |\bpont |\bmontée |\bquai |\btunnel |\bgrande rue |\bmontee |\ballee |\bbretelle |\bmail |\bcite |\banse |\bcarrefour |\bchaussee |\bchemin |\bclos |\bcote |\bcour |\bcours |\bdegre |\bdescente |\bdreve |\bescoussiere |\besplanade |\bgaffe |\bgrand route |\bliaison |\bplacette |\bpromenade |\bresidence |\brang |\brampe |\brond point |\broute |\bruelle |\bsente |\bsentier |\bsquare |\btraverse |\bvenelle |\bvoie |\bberge |\bdigue /g;
	var regex_stop_words = /\ble |\bla |\bl' |\bles |\bde |\bdu |\bdes |\bd' |\bun |\bune |\bl |\bd /g;
    var regex_military = /\bamiral |\bcaporal |\blieutenant |\bcapitaine |\bmajor |\bgénéral |\bgeneral |\bcolonel |\bmarechal |\blieutenant colonel |\bsergent |\bsergent chef |\badjudant |\bsous lieutenant |\bcommandant |\bpresident /g;
	const commonFirstNames = ['John', 'Michael', 'Alice'];

	// Construct the regex pattern to match first names followed by last names
	const regexPattern = new RegExp(`\\b(${commonFirstNames.join('|')})\\s+([A-Z][a-z]+)\\s+`, 'ig');

	var partial_match = standardize(nom1).replaceAll(regex_stop_words,"")==standardize(nom2).replaceAll(regex_rues,"").replaceAll(regex_stop_words,"").replaceAll(regex_military, "");
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
/*Ancienne version du dégradé
function couleur_par_score(pts){
    return rgbToHex(
        Math.floor(255-255*pts),
        Math.floor(255*pts),
        0);
}
*/

//Dégradé à saturation et valeur constante: Rouge -> Jaune -> Vert
function couleur_par_score(pts){
    if(pts<0.5){
      return rgbToHex(
          Math.floor(255),
          Math.floor(255*2*pts),
          0);
    }else{
      return rgbToHex(
          Math.floor(255-255*pts/2),
          Math.floor(255),
          0);
    }
      
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
                add_in_list_found(name2, polylines[i]);
            }
        }
    }
    print_score();
}

function add_in_list_found(name, thispolyline){
    let name_std = standardize(name).replaceAll("' ","_").replaceAll(" ","_")
    let li = document.createElement("li")
    li.innerHTML = "<li id='list_found_"+name_std+"'>"+name+"</li>";
    document.getElementById("list_found").appendChild(li);
    document.getElementById("list_found_"+name_std).onclick=function(){
        console.log(name_std);
        thispolyline.openTooltip();
        mymap.panTo(thispolyline._latlngs[0], thispolyline._latlngs[1])
    }
    document.getElementById("list_found_"+name_std).scrollIntoView();
    trouves_uniques.push(name);
    console.log(name);
}

document.getElementById("upload").onchange = function(){
    file = document.getElementById("upload").files[0];
    urlfile = URL.createObjectURL(file);
    fetch(urlfile)
    .then(r=>r.json())
    .then(r=>upload_save(r))
}