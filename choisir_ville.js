// --- INITIALISATION DE LA CARTE ---
const mymap = L.map('mapid').setView([46.875378329598036, 2.565228180873064], 6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 22,
    maxNativeZoom: 19
}).addTo(mymap);

// --- FONCTIONS DE REDIRECTION ---
function choisir(lieu) {
    localStorage.setItem("lieu", lieu);
    window.location.href = "./retrouver_les_rues.html";
}

function choisir_inverse(lieu) {
    localStorage.setItem("lieu", lieu);
    window.location.href = "./jeu_inverse.html";
}

// --- CHARGEMENT DES DONNÉES JSON ET CRÉATION DES MARQUEURS ---
async function initMap() {
    try {
        const [citiesResponse, markersResponse] = await Promise.all([
            fetch('cities.json'),
            fetch('markers.json')
        ]);

        const citiesConfig = await citiesResponse.json();
        const markersConfig = await markersResponse.json();

        markersConfig.forEach(markerData => {
            // Création de l'icône Leaflet
            const customIcon = L.icon({
                iconUrl: markerData.icon.url,
                iconSize: markerData.icon.size,
                iconAnchor: markerData.icon.anchor
            });

            // Construction dynamique du HTML de la popup
            let popupContent = `<div class="popup-container">`;
            
            markerData.villes.forEach(cityKey => {
                const city = citiesConfig[cityKey];
                if (city) {
                    const cityName = city.nom || cityKey;
                    // Échappement des guillemets simples au cas où le nom de la clé en contient
                    const safeKey = cityKey.replace(/'/g, "\\'");
                    
                    popupContent += `
                        <div class="popup-group" style="margin-bottom: 8px;">
                            <button onclick="choisir('${safeKey}')">Choisir ${cityName}</button>
                            <button onclick="choisir_inverse('${safeKey}')">Choisir ${cityName} (inverse)</button>
                        </div>
                    `;
                }
            });

            popupContent += `</div>`;

            // Ajout du marqueur sur la carte
            L.marker(markerData.coords, { icon: customIcon })
                .addTo(mymap)
                .bindPopup(popupContent);
        });

    } catch (err) {
        console.error("Erreur lors du chargement des configurations JSON :", err);
    }
}

initMap();