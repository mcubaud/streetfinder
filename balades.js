// --- CONFIGURATION PAR VILLE ---
var CITIES_CONFIG = {
    Lyon: {
        coords: [45.75728373443727, 4.849433898925782],
        file: "rues.geojson",
        inv_lonlat: true
    },
    Rennes: {
        coords: [48.11105621460431, -1.676739113603782],
        file: "rues_rennes.geojson",
        inv_lonlat: true
    },
    Fontenay: {
        coords: [48.84998735534551, 2.4531255994843977],
        file: "rues_vincennes_fontenay.geojson",
        inv_lonlat: true
    }
};

// --- varANTES REGEX (compilées une fois) ---
var REGEX_RUES = /\b(rue|avenue|boulevard|cours|place|impasse|allée|ruelle|passage|pont|montée|quai|tunnel|grande rue|montee|allee|bretelle|mail|cite|anse|carrefour|chaussee|chemin|clos|cote|cour|degre|descente|dreve|escoussiere|esplanade|gaffe|grand route|liaison|placette|promenade|residence|rang|rampe|rond point|route|sente|sentier|square|traverse|venelle|voie|berge|digue)\b/g;
var REGEX_STOP_WORDS = /\b(le|la|l'|les|de|du|des|d'|un|une|l|d)\b/g;
var REGEX_MILITARY = /\b(amiral|caporal|lieutenant|capitaine|major|général|general|colonel|marechal|lieutenant colonel|sergent|sergent chef|adjudant|sous lieutenant|commandant|president)\b/g;

// --- ETAT GLOBAL ---
var lieu = localStorage.getItem("lieu") || "Rennes";
var config = CITIES_CONFIG[lieu] || CITIES_CONFIG["Rennes"];

let totalLength = 0;
let findLength = 0;

var polylines = {};
var names = {};
var trouves = {};
var trouvesUniques = [];

// --- INITIALISATION TITRE ET CARTE ---
console.log(lieu);
document.getElementById("titre").children[0].innerHTML += lieu;
document.title += ` ${lieu}`;

var mymap = L.map('mapid').setView(config.coords, 13);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
}).addTo(mymap);

// --- CHARGEMENT ET AFFICHAGE DES DONNÉES ---
async function initData() {
    try {
        var response = await fetch(config.file);
        var jsonBalades = await response.json();
        
        jsonBalades.features.forEach((obj, i) => {
            if ( config.inv_lonlat ){
                if ( obj.geometry.type == "MultiLineString"){
                    var latlngs = obj.geometry.coordinates.map(y => y.map(x =>  [x[1], x[0]]));
                }else{
                    var latlngs = obj.geometry.coordinates.map(x => [x[1], x[0]]);
                }
            }else{
                var latlngs = obj.geometry.coordinates
            }
            var polyline = L.polyline(latlngs, { color: '#3b364b' }).addTo(mymap);

            polyline.nom = obj.properties.name;
            polyline.length = obj.properties.length || 0;

            var otherTags = obj.properties.other_tags;
            if (otherTags && otherTags.includes('"wikipedia"=>"')) {
                polyline.wiki = otherTags.split('"wikipedia"=>"')[1].split('"')[0];
            }

            totalLength += polyline.length;
            polylines[i] = polyline;
            names[i] = obj.properties.name;
            trouves[i] = false;
        });

        printScore();
    } catch (err) {
        console.error("Erreur lors du chargement des données GeoJSON :", err);
    }
}

initData();

// --- ECOUTEURS D'ÉVÉNEMENTS ---
var inputAdresse = document.getElementById('inputAdresse');

inputAdresse.addEventListener('focusout', chercher);
inputAdresse.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') chercher();
});

document.getElementById("btn-recherche").onclick = chercher;

document.getElementById("save").onclick = () => {
    downloadObjectAsJson(trouves, `streetfinder_save_${lieu}`);
};

document.getElementById("upload").onchange = function () {
    var file = this.files[0];
    if (!file) return;
    var urlfile = URL.createObjectURL(file);
    fetch(urlfile)
        .then(r => r.json())
        .then(uploadSave);
};

mymap.on('locationfound', (e) => {
    L.marker(e.latlng).addTo(mymap)
        .bindPopup(`You are within ${e.accuracy} meters from this point`).openPopup();
    L.circle(e.latlng, e.accuracy).addTo(mymap);
});

mymap.on('locationerror', (e) => alert(e.message));

// --- FONCTIONS LOGIQUES ---
function chercher() {
    var adresse = inputAdresse.value.trim();
    if (!adresse) return;

    let anyOk = false;
    let anyAlready = false;
    let lastAlready = null;

    for (let i in polylines) {
        var currentName = names[i];
        if (areSimilar(adresse, currentName)) {
            if (trouves[i]) {
                anyAlready = true;
                lastAlready = polylines[i];
            } else {
                var polyline = polylines[i];
                polyline.setStyle({ color: "green" });
                polyline.bindTooltip(currentName);

                if (polyline.wiki) {
                    var [langue, page] = polyline.wiki.split(":");
                    polyline.bindPopup(
                        `<iframe style='height:400px; width:100%; border:none;' src='https://${langue}.m.wikipedia.org/wiki/${page}'></iframe>`
                    );
                }

                anyOk = true;
                findLength += polyline.length;
                trouves[i] = true;

                if (!trouvesUniques.includes(currentName)) {
                    addInListFound(currentName, polyline);
                }
            }
        }
    }

    triggerAnimation(anyOk, anyAlready, lastAlready);
}

function triggerAnimation(anyOk, anyAlready, lastAlready) {
    inputAdresse.style.animation = "";
    // Forcer un reflow pour relancer l'animation CSS
    void inputAdresse.offsetWidth;

    if (anyOk) {
        inputAdresse.value = "";
        printScore();
        inputAdresse.style.animation = "clignoter_vert 500ms linear";
    } else if (anyAlready) {
        if (lastAlready) {
            lastAlready.openPopup();
            mymap.flyToBounds(lastAlready.getBounds());
        }
        inputAdresse.style.animation = "secouer_petit_orange 1s linear";
    } else {
        inputAdresse.style.animation = "secouer_petit 1s linear";
    }

    setTimeout(() => { inputAdresse.style.animation = ""; }, 1000);
}

function standardize(str) {
    return str
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Supprime les accents proprement
        .replaceAll("-", " ")
        .replaceAll("œ", "oe")
        .replaceAll("'", "' ");
}

function areSimilar(nom1, nom2) {
    var std1 = standardize(nom1);
    var std2 = standardize(nom2);

    var exactMatch = std1 === std2;
    var partialMatch = std1.replace(REGEX_STOP_WORDS, "") === 
        std2.replace(REGEX_RUES, "").replace(REGEX_STOP_WORDS, "").replace(REGEX_MILITARY, "");

    return Boolean(exactMatch || partialMatch);
}

function printScore() {
    if (totalLength === 0) return;
    var ratio = findLength / totalLength;
    var scoreElem = document.getElementById("score");
    
    scoreElem.innerHTML = `${Math.round(findLength / 1000)} / ${Math.round(totalLength / 1000)} km (${Math.round(100 * ratio)}%) des rues trouvées`;
    scoreElem.style.color = couleurParScore(ratio);
    document.getElementById("file").value = Math.round(100 * ratio);
}

function couleurParScore(pts) {
    if (pts < 0.5) {
        return rgbToHex(255, Math.floor(255 * 2 * pts), 0);
    }
    return rgbToHex(Math.floor(255 - 255 * (pts / 2)), 255, 0);
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function uploadSave(savedTrouvees) {
    for (let i in polylines) {
        var currentName = names[i];
        if (savedTrouvees[i]) {
            var polyline = polylines[i];
            polyline.setStyle({ color: "green" });
            polyline.bindTooltip(currentName);

            if (polyline.wiki) {
                var [langue, page] = polyline.wiki.split(":");
                polyline.bindPopup(
                    `<iframe style='height:400px; width:100%; border:none;' src='https://${langue}.m.wikipedia.org/wiki/${page}'></iframe>`
                );
            }

            if (!trouves[i]) {
                findLength += polyline.length;
                trouves[i] = true;
            }
            if (!trouvesUniques.includes(currentName)) {
                addInListFound(currentName, polyline);
            }
        }
    }
    printScore();
}

function addInListFound(name, thisPolyline) {
    var nameStd = standardize(name).replaceAll("' ", "_").replaceAll(" ", "_");
    var li = document.createElement("li");
    li.id = `list_found_${nameStd}`;
    li.textContent = name;

    li.onclick = () => {
        thisPolyline.openTooltip();
        var latLngs = thisPolyline.getLatLngs();
        if (latLngs.length > 0) {
            mymap.panTo(latLngs[0]);
        }
    };

    document.getElementById("list_found").appendChild(li);
    li.scrollIntoView();
    trouvesUniques.push(name);
}

function downloadObjectAsJson(exportObj, exportName) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${exportName}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}
