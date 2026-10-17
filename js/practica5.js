/* Practica 5 independiente. Estructura de funciones como en los ejemplos del curso. */
var renderer, scene, camera, cameraTop, cameraControls;
var robot, base, brazo, antebrazo, pinza, dedoIzquierdo, dedoDerecho;
var suelo, mapaEntorno, controles, gui;
var materiales = [], teclas = {};
var reloj = new THREE.Clock();
var numeroMaterial = 0;
function iniciarPractica5() {
  crearRenderizador();
  crearEscena();
  crearCamara();
  crearSuelo();
  crearRobot();
  var reflejo = new THREE.MeshPhongMaterial({envMap: mapaEntorno, reflectivity: 0.9, shininess: 120});
  materiales.push(reflejo);
  brazo.getObjectByName('rotula').material = reflejo;
  crearInterfaz();
  crearTeclado();
  window.addEventListener('resize', redimensionar);
  render();
}
function crearRenderizador() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('container').appendChild(renderer.domElement);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  // Comprimir las zonas muy iluminadas para conservar el detalle de las texturas.
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.physicallyCorrectLights = true;
  renderer.setClearColor(0x151922);
}

function crearEscena() {
  scene = new THREE.Scene();
  var rutas = ['images/posx.jpg', 'images/negx.jpg', 'images/posy.jpg',
               'images/negy.jpg', 'images/posz.jpg', 'images/negz.jpg'];
  mapaEntorno = new THREE.CubeTextureLoader().load(rutas);
  mapaEntorno.encoding = THREE.sRGBEncoding;
  scene.background = mapaEntorno;
}

function crearCamara() {
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 2000);
  camera.position.set(280, 230, 330);

  cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 125, 0);
  cameraControls.enableDamping = true;
  cameraControls.dampingFactor = 0.08;
  cameraControls.enableKeys = false;

  cameraTop = new THREE.OrthographicCamera(-150, 150, 150, -150, 1, 1000);
  cameraTop.position.set(0, 500, 0);
  cameraTop.up.set(0, 0, -1);
  cameraTop.lookAt(0, 0, 0);
}

function material(color) {
  numeroMaterial = (numeroMaterial || 0) + 1;
  var cargador = new THREE.TextureLoader();
  var textura = cargador.load(numeroMaterial % 2 ? 'images/metal_128.jpg' : 'images/wood512.jpg');
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(1, 2);
  textura.encoding = THREE.sRGBEncoding;
  var parametros = { color: color, map: textura };
  var material = numeroMaterial % 2
    ? new THREE.MeshPhongMaterial({ color: color, map: textura, shininess: 50, specular: 0x333333 })
    : new THREE.MeshLambertMaterial(parametros);
  materiales.push(material);
  return material;
}

function prepararMalla(malla) {
  malla.castShadow = true;
  malla.receiveShadow = true;
  return malla;
}

function crearSuelo() {

  var textura = new THREE.TextureLoader().load('images/pisometalico_1024.jpg');
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(10, 10);
  textura.encoding = THREE.sRGBEncoding;
  var material = new THREE.MeshPhongMaterial({ map: textura, side: THREE.DoubleSide, shininess: 35 });
  materiales.push(material);
  suelo = prepararMalla(new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), material));
  suelo.rotation.x = -Math.PI / 2;
  scene.add(suelo);
  crearHabitacion();
  crearLuces();
}

function crearHabitacion() {
  var nombres = ['posx.jpg','negx.jpg','posy.jpg','negy.jpg','posz.jpg','negz.jpg'];
  var cargador = new THREE.TextureLoader();
  var materiales = nombres.map(function(nombre) {
    var mapa = cargador.load('images/' + nombre);
    mapa.encoding = THREE.sRGBEncoding;
    return new THREE.MeshPhongMaterial({ map: mapa, side: THREE.BackSide, shininess: 10 });
  });
  var habitacion = new THREE.Mesh(new THREE.BoxGeometry(1000, 500, 1000), materiales);
  /* La base queda en y=-1 para que no coincida con el suelo situado en y=0.
     La separacion evita el parpadeo producido por z-fighting. */
  habitacion.position.y = 249;
  habitacion.receiveShadow = true;
  scene.add(habitacion);
}

function crearLuces() {
  scene.add(new THREE.AmbientLight(0x6688aa, 0.35));
  var direccional = new THREE.DirectionalLight(0xffffff, 2.2);
  direccional.position.set(-180, 280, 160);
  direccional.castShadow = true;
  direccional.shadow.camera.left = -250; direccional.shadow.camera.right = 250;
  direccional.shadow.camera.top = 300; direccional.shadow.camera.bottom = -100;
  direccional.shadow.mapSize.set(2048, 2048);
  direccional.shadow.camera.far = 1000;
  direccional.shadow.normalBias = 0.15;
  scene.add(direccional);

  var focal = new THREE.SpotLight(0xffd7a0, 45000, 700, Math.PI / 5, 0.35, 2);
  focal.position.set(180, 300, 180);
  focal.target.position.set(0, 70, 0);
  focal.castShadow = true;
  focal.shadow.mapSize.set(2048, 2048);
  focal.shadow.camera.far = 1000;
  focal.shadow.normalBias = 0.15;
  scene.add(focal, focal.target);
}

function crearRobot() {
  robot = new THREE.Object3D();
  robot.name = 'robot';
  scene.add(robot);

  /* Base: el origen queda en el centro de su cara inferior. */
  base = new THREE.Object3D();
  base.name = 'base';
  robot.add(base);
  var cilindroBase = prepararMalla(new THREE.Mesh(
    new THREE.CylinderGeometry(50, 50, 15, 40), material(0x3979b9)
  ));
  cilindroBase.position.y = 7.5;
  base.add(cilindroBase);

  /* Brazo: eje, esparrago y rotula agrupados para girar juntos en Z. */
  brazo = new THREE.Object3D();
  brazo.name = 'brazo';
  brazo.position.y = 15;
  base.add(brazo);

  var eje = prepararMalla(new THREE.Mesh(
    new THREE.CylinderGeometry(20, 20, 18, 32), material(0xe48b32)
  ));
  eje.rotation.x = Math.PI / 2;
  brazo.add(eje);

  var esparrago = prepararMalla(new THREE.Mesh(
    new THREE.BoxGeometry(18, 120, 12), material(0xd95f4c)
  ));
  esparrago.position.y = 60;
  brazo.add(esparrago);

  var rotula = prepararMalla(new THREE.Mesh(
    new THREE.SphereGeometry(20, 32, 20), material(0xf2c14e)
  ));
  rotula.name = 'rotula';
  rotula.position.y = 120;
  brazo.add(rotula);

  /* Antebrazo: su origen coincide con el centro de la rotula. */
  antebrazo = new THREE.Object3D();
  antebrazo.name = 'antebrazo';
  antebrazo.position.y = 120;
  brazo.add(antebrazo);

  var disco = prepararMalla(new THREE.Mesh(
    new THREE.CylinderGeometry(22, 22, 6, 32), material(0x4a90d9)
  ));
  // El origen del antebrazo coincide con el centro de la rotula.
  // El disco rodea su ecuador, como en la figura del enunciado.
  disco.position.y = 0;
  antebrazo.add(disco);

  var geometriaNervio = new THREE.BoxGeometry(4, 80, 4);
  // La cara superior del disco esta en y=3; nervios de longitud 80.
  var posiciones = [[-8, 43, -8], [8, 43, -8], [-8, 43, 8], [8, 43, 8]];
  for (var i = 0; i < posiciones.length; i++) {
    var nervio = prepararMalla(new THREE.Mesh(
      geometriaNervio, material(0x6abf69)
    ));
    nervio.position.set(posiciones[i][0], posiciones[i][1], posiciones[i][2]);
    antebrazo.add(nervio);
  }

  // Nodo de la mano: conserva los ejes de las articulaciones.
  var mano = new THREE.Object3D();
  mano.name = 'mano';
  mano.position.y = 83;
  antebrazo.add(mano);
  var cilindroMano = prepararMalla(new THREE.Mesh(
    new THREE.CylinderGeometry(15, 15, 40, 32), material(0x6f58a8)
  ));
  cilindroMano.rotation.x = Math.PI / 2;
  mano.add(cilindroMano);

  /* Pinza: los dos dedos parten del eje de la mano. */
  pinza = new THREE.Object3D();
  pinza.name = 'pinza';
  mano.add(pinza);
  dedoIzquierdo = crearDedo(1);
  dedoDerecho = crearDedo(-1);
  pinza.add(dedoIzquierdo, dedoDerecho);
  abrirPinza(10);
}

function crearDedo(signo) {
  var dedo = new THREE.Object3D();
  // En la figura los dedos cuelgan desde la mano. La geometria se construye
  // a lo largo de X y este nodo la inclina hacia abajo y hacia delante.
  var forma = new THREE.Object3D();
  forma.rotation.z = -Math.PI / 3;
  dedo.add(forma);
  var palma = prepararMalla(new THREE.Mesh(
    new THREE.BoxGeometry(19, 20, 4), material(0xde5a6a)
  ));
  palma.position.set(9.5, 0, 2);
  forma.add(palma);

  /* Dedo: longitud total 38 (19 de palma y 19 de cuña), altura 20.
     El extremo se estrecha en altura y grosor para formar la parte piramidal.
     Se duplican vertices por cara para tener normales y UV independientes. */
  var vertices = new Float32Array([
    // Interior: normal -Z.
    19,-10,0, 19,10,0, 38,5,0, 38,-5,0,
    // Exterior inclinado.
    19,-10,4, 38,-5,2, 38,5,2, 19,10,4,
    // Union con la palma: normal -X.
    19,-10,0, 19,-10,4, 19,10,4, 19,10,0,
    // Extremo: normal +X.
    38,-5,0, 38,5,0, 38,5,2, 38,-5,2,
    // Superior: normal +Y.
    19,10,0, 19,10,4, 38,5,2, 38,5,0,
    // Inferior: normal -Y.
    19,-10,0, 38,-5,0, 38,-5,2, 19,-10,4
  ]);
  var indices = [];
  var uvs = [];
  for (var cara = 0; cara < 6; cara++) {
    var v = cara * 4;
    indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
    uvs.push(0,0, 1,0, 1,1, 0,1);
  }
  var geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometria.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometria.setIndex(indices);
  geometria.computeVertexNormals();
  var cuna = prepararMalla(new THREE.Mesh(geometria, material(0xde5a6a)));
  forma.add(cuna);
  // El segundo dedo se obtiene girando el primero, sin invertir las caras.
  // Reflejar Z conservando la direccion de ambos dedos mediante una rotacion
  // de la geometria antes de su inclinacion (la seccion es simetrica en Y).
  if (signo < 0) forma.rotation.x = Math.PI;
  forma.rotation.order = 'ZXY';
  return dedo;
}

function abrirPinza(apertura) {
  dedoIzquierdo.position.z = apertura;
  dedoDerecho.position.z = -apertura;
}

function redimensionar() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function crearTeclado() {
  teclas = {};
  window.addEventListener('keydown', function(evento) {
    if (evento.code.indexOf('Arrow') === 0) evento.preventDefault();
    teclas[evento.code] = true;
  });
  window.addEventListener('keyup', function(evento) {
    teclas[evento.code] = false;
  });
  window.addEventListener('blur', function() { teclas = {}; });
}

function crearInterfaz() {
  controles = {
    giroBase: 0,
    giroBrazo: 0,
    giroAntebrazoY: 0,
    giroAntebrazoZ: 0,
    giroPinza: 0,
    aperturaPinza: 10,
    alambrico: false,
    animar: function() { lanzarAnimacion(); }
  };

  gui = new lil.GUI({ title: 'Control del robot' });
  gui.add(controles, 'giroBase', -180, 180, 1).name('Giro base');
  gui.add(controles, 'giroBrazo', -45, 45, 1).name('Giro brazo');
  gui.add(controles, 'giroAntebrazoY', -180, 180, 1).name('Antebrazo Y');
  gui.add(controles, 'giroAntebrazoZ', -90, 90, 1).name('Antebrazo Z');
  gui.add(controles, 'giroPinza', -40, 220, 1).name('Giro pinza');
  gui.add(controles, 'aperturaPinza', 0, 15, 0.1).name('Apertura');
  gui.add(controles, 'alambrico').name('Alámbrico');
  gui.add(controles, 'animar').name('Animación');
}

function aplicarControles() {
  var c = controles;
  base.rotation.y = THREE.MathUtils.degToRad(c.giroBase);
  brazo.rotation.z = THREE.MathUtils.degToRad(c.giroBrazo);
  antebrazo.rotation.y = THREE.MathUtils.degToRad(c.giroAntebrazoY);
  antebrazo.rotation.z = THREE.MathUtils.degToRad(c.giroAntebrazoZ);
  pinza.rotation.z = THREE.MathUtils.degToRad(c.giroPinza);
  abrirPinza(c.aperturaPinza);
  for (var i = 0; i < materiales.length; i++) {
    materiales[i].wireframe = c.alambrico;
  }
}

function lanzarAnimacion() {
  TWEEN.removeAll();
  var inicio = {
    giroBase: controles.giroBase,
    giroBrazo: controles.giroBrazo,
    giroAntebrazoY: controles.giroAntebrazoY,
    giroAntebrazoZ: controles.giroAntebrazoZ,
    giroPinza: controles.giroPinza,
    aperturaPinza: controles.aperturaPinza
  };
  var pose1 = new TWEEN.Tween(controles)
    .to({ giroBase: 120, giroBrazo: -35, giroAntebrazoY: 150,
          giroAntebrazoZ: 55, giroPinza: 120, aperturaPinza: 15 }, 1800)
    .easing(TWEEN.Easing.Quadratic.InOut);
  var pose2 = new TWEEN.Tween(controles)
    .to({ giroBase: -100, giroBrazo: 35, giroAntebrazoY: -120,
          giroAntebrazoZ: -45, giroPinza: 10, aperturaPinza: 2 }, 1800)
    .easing(TWEEN.Easing.Quadratic.InOut);
  var volver = new TWEEN.Tween(controles).to(inicio, 1600)
    .easing(TWEEN.Easing.Quadratic.InOut);
  pose1.chain(pose2); pose2.chain(volver); pose1.start();
}
function update() {
  var delta = Math.min(reloj.getDelta(), 0.05);
  cameraControls.update();
  var paso = 100 * delta;
  if (teclas.ArrowUp) robot.position.z -= paso;
  if (teclas.ArrowDown) robot.position.z += paso;
  if (teclas.ArrowLeft) robot.position.x -= paso;
  if (teclas.ArrowRight) robot.position.x += paso;
  TWEEN.update();
  aplicarControles();
  for (var i = 0; i < gui.controllers.length; i++) gui.controllers[i].updateDisplay();
}
function render() {
  requestAnimationFrame(render);
  update();
  var ancho = window.innerWidth, alto = window.innerHeight;
  var lado = Math.min(ancho, alto) / 4;
  renderer.autoClear = false;
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, ancho, alto);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setViewport(0, alto - lado, lado, lado);
  renderer.setScissor(0, alto - lado, lado, lado);
  renderer.setScissorTest(true);
  renderer.clear(true, true, false);
  renderer.render(scene, cameraTop);
  renderer.setScissorTest(false);
}
