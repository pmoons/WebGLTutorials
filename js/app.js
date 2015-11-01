var gl; // A global variable for the WebGL context
var canvas;
var squareVerticesBuffer;
var mvMatrix;
var shaderProgram;
var vertexPositionAttribute;
var vertexColorAttribute;
var perspectiveMatrix;

function start() {
    canvas = document.getElementById("glcanvas");

    // Initialize the GL context
    gl = initWebGL(canvas);
    // Only continue if WebGL is available and working

    if (gl) {
        // Set clear color to black, fully opaque
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        // Enable depth testing
        gl.enable(gl.DEPTH_TEST);
        // Near things obscure far things
        gl.depthFunc(gl.LEQUAL);
        // Clear the color as well as the depth buffer.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Initialize the shaders; this is where all the lighting for the vertices
        // and so forth are established.

        initShaders();

        // Here's where we call the routine that builds all the objects we'll be drawing.

        initBuffers();

        // Set up to draw the scene periodically.

        setInterval(drawScene, 15);
    }
}

function initWebGL(canvas) {
    gl = null;

    try {
        // Try to grab the standard context. If it fails, fallback to experimental.
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    }
    catch(e) {}

    // If we don't have a GL context, give up now
    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
        gl = null;
    }

    return gl;
}

function initBuffers() {

    // Create a buffer for the square's vertices.
    squareVerticesBuffer = gl.createBuffer();

    // Select the squareVerticesBuffer as the one to apply vertex
    // operations to from here out.

    gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);

    // Now create an array of vertices for the square, Note that the Z
    // coordinate is always 0 here.

    var vertices = [
        1.0, 1.0, 0.0,
        -1.0, 1.0, 0.0,
        1.0, -1.0, 0.0,
        -1.0, -1.0, 0.0
    ];

    // Now pass the list of vertices into WebGL to build the shape. We
    // do this by creating a Float32Array from the JavaScript array,
    // then use it to fill the current vertex buffer

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    var colors = [
        1.0, 1.0, 1.0, 1.0,     // white
        1.0, 0.0, 0.0, 1.0,     // red
        0.0, 1.0, 0.0, 1.0,     // green
        0.0, 0.0, 1.0, 1.0      // blue
    ];

    squareVerticesColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
}

function drawScene() {
    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Establish the perspective with which we want to view the
    // scene.  Our field of view is 45 degrees, with a width/height
    // ratio of 640:480, and we only want to see objects between 0.1 units
    // and 100 units away from the camera

    perspectiveMatrix = makePerspective(45, 640.0/480.0, 0.1, 100.0);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.

    loadIdentity();

    // Now move the drawing position a bit to where we want to start
    // drawing the square.

    mvTranslate([-0.0, 0.0, -6.0]);

    // Draw the square by binding the array buffer to the square's vertices
    // array, setting the attributes, and pushing it to GL.

    gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Set the colors attribute for the vertices

    gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesColorBuffer);
    gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

    // Draw the square

    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    // Create the shader program

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Unable to initialize the shader program.");
    }

    gl.useProgram(shaderProgram);

    vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(vertexPositionAttribute);

    vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(vertexColorAttribute);
}

function getShader(gl, id) {
    var shaderScript, theSource, currentChild, shader;

    shaderScript = document.getElementById(id);

    // Didn't find an element with teh specified ID; abort.

    if (!shaderScript) {
        return null;
    }

    // Walk through the source element's children, building the
    // shader source string.

    theSource = "";
    currentChild = shaderScript.firstChild;

    while(currentChild) {
        if (currentChild.nodeType == currentChild.TEXT_NODE) {
            theSource += currentChild.textContent;
        }

        currentChild = currentChild.nextSibling;
    }

    // Now figure out what type of shader script we haven,
    // based on its MIME type.

    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null; // Unknown shader type
    }

    // Send the source to the shader objects

    gl.shaderSource(shader, theSource);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function loadIdentity() {
    mvMatrix = Matrix.I(4);
}

function multMatrix(m) {
    mvMatrix = mvMatrix.x(m);
}

function mvTranslate(v) {
    multMatrix(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
}

function setMatrixUniforms() {
    var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix.flatten()));

    var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));
}
