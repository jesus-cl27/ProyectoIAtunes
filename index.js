const axios = require('axios');
var express = require('express');
const bodyParser = require('body-parser');
const gtts = require('gtts');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Carpeta donde se guardarán los archivos

const fileUpload = require('express-fileupload');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');

var app = express();

var respuesta = "";
// Configurar el middleware de análisis de cuerpo
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//4 -seteamos el directorio de assets
app.use('/resources',express.static('public'));

app.use('/resources', express.static(__dirname + '/public'));
var publicDir = require('path').join(__dirname, '/public');
app.use(express.static(publicDir));


app.get('/reproducir', (req, res) => {
  // Envía el archivo MP3 al navegador
  res.sendFile(__dirname + '/voz_generada.mp3');
});


//5 - Establecemos el motor de plantillas
app.set('view engine','ejs');

// Configura middleware para el manejo de archivos
//app.use(fileUpload());

// Página web con formulario para cargar archivos
//app.get('/', (req, res) => {
//  res.sendFile(__dirname + '/views/index.ejs');
//});

// Procesamiento del formulario
app.post('/mezclar', (req, res) => {
  if (!req.files.ritmo || !req.files.voz) {
    console.log(req.files.ritmo);
    return res.status(400).send('Por favor, carga ambas pistas de voz y música.');
  }

  // Guarda los archivos cargados en el servidor
  const voz = req.files.voz;
  const ritmo = req.files.ritmo;

  // Realiza la mezcla de pistas utilizando ffmpeg
  ffmpeg()
    .input(voz.data)
    .input(ritmo.data)
    .complexFilter(['[0:a][1:a]amix=inputs=2:duration=first'])
    .toFormat('mp3')
    .on('end', () => {
      console.log('Mezcla completa.');
      res.download('mezcla.mp3', 'cancion.mp3');
    })
    .on('error', (err) => {
      console.error('Error de mezcla:', err);
      res.status(500).send('Error al mezclar las pistas.');
    })
    .save('mezcla.mp3');
});

const apiKey = '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'; // Reemplaza con tu clave API de OpenAI

async function obtenerRespuesta(input) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: input,
        },
      ],
      model: 'gpt-3.5-turbo', // Especifica el modelo que deseas usar
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const respuesta = response.data.choices[0].message.content;
    return respuesta;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}




// Modifica la función para generar la letra
app.post('/consultar', async (req, res) => {
  const prompt = req.body.prompt;
  console.log(prompt);

  

  respuesta = await obtenerRespuesta(prompt);
  console.log('Respuesta:', respuesta);

   
  res.render('index', { res: respuesta });
});




//  función para generar la voz
app.get('/generar-voz', (req, res) => {
  const texto = respuesta || 'Texto por defecto';
  const idioma = req.body.idioma || 'es';

 

  const speech = new gtts(texto, idioma);
  speech.save('voz_generada.mp3', (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error al generar la voz.');
    } else {
      res.download('voz_generada.mp3', 'voz_generada.mp3', (err) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error al generar la voz.');
        } else {
         console.log("Sii");
        }
      });
      res.end();
    }
  });
});

//main();
app.get('/',(req, res)=>{
  res.render('index', {res:respuesta});
})
app.listen(3000, (req, res)=>{
  console.log('SERVER RUNNING IN http://localhost:3000');
});