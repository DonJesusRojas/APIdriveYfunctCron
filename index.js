// Importa las bibliotecas necesarias
const fs = require('fs');  // Para operaciones relacionadas con archivos
const readline = require('readline');  // Para interactuar con la consola
const { google } = require('googleapis');  // SDK de Google para interactuar con Google Drive y otros servicios
const cron = require('node-cron');  // Biblioteca para programar tareas

// Define los alcances que la aplicación necesitará para acceder a Google Drive
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly', 'https://www.googleapis.com/auth/drive'];

// Lee las credenciales desde un archivo. Estas son necesarias para la autenticación con Google Drive.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Si las credenciales se cargan correctamente, se autoriza y se comienza a organizar los archivos.
    authorize(JSON.parse(content), organizeFiles);
});

// Función para organizar archivos en Google Drive
function organizeFiles(auth) {
    const drive = google.drive({ version: 'v3', auth });

    // Establece una tarea cron para organizar los archivos cada minuto
    cron.schedule('* * * * *', function () {
        // Lista todos los archivos en Google Drive
        drive.files.list({}, (err, res) => {
            if (err) return console.log('The API returned an error: ' + err);
            const files = res.data.files;
            if (files.length) {
                // Itera sobre cada archivo
                files.forEach(file => {
                    // Obtiene la primera letra del nombre del archivo y la convierte a mayúsculas
                    let firstLetter = file.name.charAt(0).toUpperCase();
                    // Verifica en qué rango alfabético se encuentra la primera letra y mueve el archivo al directorio correspondiente
                    if (firstLetter >= 'A' && firstLetter <= 'M') {
                        moveFile(drive, file.id, '1c1aFysrV0uedAYZ-psW7cC44d0SIxa-O');
                    } else if (firstLetter >= 'N' && firstLetter <= 'Z') {
                        moveFile(drive, file.id, '10M8fAIo7CXUikeFagJIVjy3g9p-5cCR4');
                    }
                });
            } else {
                console.log('No files found.');
            }
        });
    });
}

// Función para mover un archivo a un directorio específico en Google Drive
function moveFile(drive, fileId, folderId) {
    // Obtiene la información del archivo, específicamente sus padres (directorios donde reside actualmente)
    drive.files.get({
        fileId: fileId,
        fields: 'parents'
    }, function (err, file) {
        if (err) {
            console.error('Error getting file parents:', err);
            return;
        }
        // Extrae los padres del archivo y los une en una cadena
        let previousParents = '';
        if (file && file.data && Array.isArray(file.data.parents)) {
            previousParents = file.data.parents.join(',');
        }

        // Actualiza la información del archivo, moviéndolo al nuevo directorio y eliminándolo del antiguo
        drive.files.update({
            fileId: fileId,
            addParents: folderId,
            removeParents: previousParents,
            fields: 'id, parents'
        }, function (err, file) {
            if (err) {
                console.error('Error moving file:', err);
            } else {
                console.log('File moved successfully', file.data.id);
            }
        });
    });
}

// Función para autorizar el acceso a Google Drive
function authorize(credentials, callback) {
    const { client_secret, client_id } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:3000/callback');

    // Comprueba si ya existe un token de acceso almacenado. Si no es así, solicita uno nuevo.
    fs.readFile('token.json', (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

// Función para obtener un nuevo token de acceso
function getAccessToken(oAuth2Client, callback) {
    // Genera una URL de autenticación para el usuario
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    
    // Pregunta al usuario por el código de autenticación después de autorizar en la URL anterior
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        
        // Solicita un token de acceso usando el código proporcionado por el usuario
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error while trying to retrieve access token', err);
            oAuth2Client.setCredentials(token);

            // Almacena el nuevo token en un archivo para futuros usos
            fs.writeFile('token.json', JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', 'token.json');
            });
            callback(oAuth2Client);
        });
    });
}
