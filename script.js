document.addEventListener('DOMContentLoaded', async () => {
    const tipoDanoSelect = document.getElementById('tipoDano');
    const severidadCriticoSelect = document.getElementById('severidadCritico');
    const tiradaInput = document.getElementById('tirada');
    const calcularBtn = document.getElementById('calcularBtn');
    const resultadoTexto = document.getElementById('resultadoTexto');

    let criticosData = {};       // Objeto para almacenar TODAS las tablas de críticos, incluido Plasma.
    // ELIMINADO: let criticosPlasmaData = []; // Esta variable ya no es necesaria

    // Función auxiliar para cargar un archivo JSON
    async function cargarJSON(ruta) {
        try {
            const response = await fetch(ruta);
            if (!response.ok) {
                throw new Error(`Error HTTP! Estado: ${response.status} al cargar ${ruta}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error al cargar el archivo JSON: ${ruta}`, error);
            resultadoTexto.textContent = `Error al cargar los datos necesarios (${ruta}). Por favor, recarga la página.`;
            resultadoTexto.style.color = '#e74c3c';
            calcularBtn.disabled = true;
            throw error;
        }
    }

    // --- Cargar todos los archivos JSON al inicio ---
    try {
        // Ahora Plasma se carga directamente en criticosData, igual que los demás
        criticosData['PLASMA'] = await cargarJSON('data/criticos_plasma.json'); // <-- MODIFICADO
        criticosData['CONTUNDENTE'] = await cargarJSON('data/criticos_contundente.json');
        criticosData['PERFORACION'] = await cargarJSON('data/criticos_perforacion.json');
        criticosData['CORTANTE'] = await cargarJSON('data/criticos_cortante.json');
        criticosData['FUEGO'] = await cargarJSON('data/criticos_fuego.json');
        criticosData['ELECTRICO'] = await cargarJSON('data/criticos_electrico.json');
        // AÑADE AQUÍ MÁS LÍNEAS PARA CADA TIPO DE DAÑO QUE QUIERAS CARGAR

        // Habilitar la funcionalidad una vez que todos los datos se han cargado
        calcularBtn.addEventListener('click', calcularCritico);
        tiradaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                calcularCritico();
            }
        });
        resultadoTexto.textContent = "Datos cargados correctamente. ¡Listo para calcular!";
        resultadoTexto.style.color = '#3498db';

    } catch (error) {
        console.error("Fallo crítico en la carga inicial de datos.", error);
        resultadoTexto.textContent = "¡Error grave al iniciar la aplicación! No se pudieron cargar todas las tablas de críticos.";
        resultadoTexto.style.color = '#e74c3c';
        calcularBtn.disabled = true;
    }


    function calcularCritico() {
        const tipoDano = tipoDanoSelect.value;
        const severidadCritico = severidadCriticoSelect.value;
        const tirada = parseInt(tiradaInput.value);

        if (isNaN(tirada) || tirada < 1) {
            resultadoTexto.textContent = "Por favor, introduce una tirada válida (un número positivo).";
            resultadoTexto.style.color = '#e74c3c';
            resultadoTexto.style.whiteSpace = 'normal';
            return;
        }

        let resultadoEncontrado = false;
        let criticoDescription = "";
        resultadoTexto.style.whiteSpace = 'normal';

        // Accede a la tabla de daño específica desde criticosData
        const tablaDano = criticosData[tipoDano]; // <-- Acceso unificado para todos los tipos

        if (!tablaDano) {
            resultadoTexto.textContent = `Tipo de daño "${tipoDano}" no implementado o no se pudo cargar.`;
            resultadoTexto.style.color = '#e74c3c';
            return;
        }

        // Aquí es donde la lógica de búsqueda se diferencia por la estructura interna de los datos
        if (tipoDano === 'PLASMA') {
            // Lógica de búsqueda para Plasma (que es un array de objetos con TRD)
            let entradaPlasma = tablaDano.find(item => item.TRD === tirada);

            // Si la tirada es mayor a 100 y no se encontró una entrada exacta,
            // intenta usar la última entrada disponible (normalmente TRD 100)
            if (!entradaPlasma && tirada > 100) {
                 entradaPlasma = tablaDano.find(item => item.TRD === 100);
            }

            if (entradaPlasma && entradaPlasma[severidadCritico]) {
                criticoDescription = `Crítico de Plasma (Tirada ${tirada}, Severidad ${severidadCritico}):\n${entradaPlasma[severidadCritico]}`;
                resultadoTexto.textContent = criticoDescription;
                resultadoTexto.style.whiteSpace = 'pre-wrap';
                resultadoTexto.style.color = '#2ecc71';
                resultadoEncontrado = true;
            } else {
                resultadoTexto.textContent = `No se encontró un crítico de Plasma para la tirada ${tirada} con severidad "${severidadCritico}".`;
                resultadoTexto.style.color = '#e74c3c';
            }

        } else {
            // Lógica de búsqueda para otros tipos de daño (que son objetos con severidades y rangos)
            const tablaSeveridad = tablaDano[severidadCritico];

            if (!tablaSeveridad) {
                resultadoTexto.textContent = `Severidad "${severidadCritico}" no disponible para el tipo de daño "${tipoDano}".`;
                resultadoTexto.style.color = '#e74c3c';
                return;
            }

            // Buscar en los rangos
            for (const rango in tablaSeveridad) {
                const [minStr, maxStr] = rango.split('-').map(s => parseInt(s));

                if (tirada >= minStr && (isNaN(maxStr) || tirada <= maxStr)) {
                    criticoDescription = `${tipoDano} (${severidadCritico}): ${tablaSeveridad[rango]}`;
                    resultadoTexto.textContent = criticoDescription;
                    resultadoTexto.style.color = '#2ecc71';
                    resultadoEncontrado = true;
                    break;
                }
            }

            // Manejo de tiradas superiores al último rango definido para tipos no-Plasma
            if (!resultadoEncontrado) {
                 const rangosOrdenados = Object.keys(tablaSeveridad).sort((a,b) => {
                     const [aMin] = a.split('-').map(s => parseInt(s));
                     const [bMin] = b.split('-').map(s => parseInt(s));
                     return aMin - bMin;
                 });

                 if (rangosOrdenados.length > 0) {
                     const ultimoRango = rangosOrdenados[rangosOrdenados.length - 1];
                     const [ultMin, ultMax] = ultimoRango.split('-').map(s => parseInt(s));

                     if (tirada > ultMax) {
                        criticoDescription = `${tipoDano} (${severidadCritico}): ${tablaSeveridad[ultimoRango]} (tirada >${ultMax})`;
                        resultadoTexto.textContent = criticoDescription;
                        resultadoTexto.style.color = '#2ecc71';
                        resultadoEncontrado = true;
                     }
                 }
            }
        }

        if (!resultadoEncontrado) {
            resultadoTexto.textContent = "No se pudo encontrar un crítico para la combinación seleccionada y la tirada dada. Verifica los datos de las tablas.";
            resultadoTexto.style.color = '#e74c3c';
        }
    }
});