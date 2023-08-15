/* Gl Structs */
class GL_Program {
    constructor(gl, name, size = null, clearColor = [1, 1, 1, 1], debug = false) {
        this.gl = gl;
        this.name = name;
        this.type = this.gl.TRIANGLES;
        this.size = size;
        this.sizeFunction = null
        this.debug = debug;
        this.clearColor = clearColor;
        this.program = null;
        this.framebuffers = [{frameBuffer: null}];
        this.currFramebuffer = 0;

        //buffers
        this.drawCount = null;
        this.startVertex = 0;
        this.vertexBuffer = null;
        this.colorsBuffer = null;
        this.textureCoordBuffer = null;

        //attribute and uniform arrays
        this.attributes = [];
        this.uniforms = [];
        this.renderTextures = [];

        //shaders
        this.vertexShader = null;
        this.fragmentShader = null;

        this.log('Created.', true);
    }

    log(msg, debug = false) {
        if(debug && this.debug != debug) return;
        console.log(`Program \`${this.name}\`: ${msg}`);
    }

    enableDebug() {
        this.debug = true;
    }

    disableDebug() {
        this.debug = false;
    }

    setType(type) {
        this.type = type;
    }

    setDrawCount(numCalls) {
        this.drawCount = numCalls;
    }

    createUpdatingUniform(size, type, name, valueFunction) {
        this.uniforms.push(new GL_Uniform (
            this.gl,
            this.program,
            size,
            type,
            name,
            null,
            valueFunction
        ));
    }

    createUniform(size, type, name, data) {
        this.uniforms.push(new GL_Uniform(
            this.gl,
            this.program,
            size,
            type,
            name,
            data
        ));
    }

    createTexture(name, texSlot, glSLot, textureData = null, size = null, sampleType = null) {
        this.uniforms.push(
            new GL_Texture(
                this.gl,
                this.program,
                name,
                texSlot,
                glSLot,
                textureData,
                false,
                size,
                sampleType
            )
        );
    }

    createRenderTexture(name, texSlot, glSlot, size = [1,1], sampleType = null) {
        this.renderTextures.push(
            new GL_RenderTexture(
                this.gl,
                this.program,
                name,
                texSlot,
                glSlot,
                null,
                sampleType
            )
        );
        this.renderTextures[this.renderTextures.length-1].init(size, sampleType);
    }

    useRenderTexture(name, texSlot, glSlot, texture) {
        this.renderTextures.push(
            new GL_RenderTexture(
                this.gl,
                this.program,
                name,
                texSlot,
                glSlot,
                texture
            )
        );
    }

    createFramebuffer() {
        this.framebuffers.push(
            new GL_FrameBuffer(
                this.gl,
                this.program
            )
        );
        return this.framebuffers.length - 1;
    }

    setVertexBuffer(vertices, type = null) {
        if(!this.vertexBuffer)
            this.vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        this.drawCount = (vertices.length) / (type == null ? 3 : 1);
    }

    setColorBuffer(colors) {
        if(!this.colorsBuffer)
            this.colorsBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorsBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.STATIC_DRAW);
    }

    setTextureCoords(textureCoords) {
        if(!this.textureCoordBuffer)
            this.textureCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
    }

    createVertexShader(source) {
        this.vertexShader = new GL_Shader(
            this.gl,
            this.gl.VERTEX_SHADER,
            source
            );
    }

    createFragmentShader(source) {
        this.fragmentShader = new GL_Shader(
            this.gl,
            this.gl.FRAGMENT_SHADER,
            source
        );
    }

    checkProgramError() {
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error(this.gl.getProgramInfoLog(this.program));
        }
    }

    init(type = null) {
        //create gl program
        this.program = this.gl.createProgram();

        this.type = (type == null ? this.gl.TRIANGLES : type);
        
        //attach shaders
        if (this.vertexShader) this.gl.attachShader(this.program, this.vertexShader.shader);
        if (this.fragmentShader) this.gl.attachShader(this.program, this.fragmentShader.shader);

        //link shaders
        this.gl.linkProgram(this.program);

        this.checkProgramError();

        //init attributes
        if(this.vertexBuffer) 
            this.attributes.push(
                new GL_Attribute(
                    this.gl,
                    this.program,
                    this.gl.ARRAY_BUFFER,
                    this.vertexBuffer,
                    'a_position',
                    (this.type == this.gl.TRIANGLES ? 3 : 1),
                    this.gl.FLOAT
                )
            );

        if(this.textureCoordBuffer)
            this.attributes.push(
                new GL_Attribute(
                    this.gl,
                    this.program,
                    this.gl.ARRAY_BUFFER,
                    this.textureCoordBuffer,
                    'a_texcoord',
                    2,
                    this.gl.FLOAT
                )
            );

        if(this.colorsBuffer)
            this.attributes.push(
                new GL_Attribute(
                    this.gl,
                    this.program,
                    this.gl.ARRAY_BUFFER,
                    this.colorsBuffer,
                    'a_color',
                    3,
                    this.gl.FLOAT
                )
            );
        this.log('Initialized.', true);
    }

    setSize(size) {
        this.log(`Setting size tp ${size} and disabling any updating size.`);
        this.size = size;
        //disable the size function
        this.sizeFunction = null;
    }

    setUpdatingSize(sizeFunction) {
        this.log(`\n\tSetting size function:\n\t\tCurrent value: ${sizeFunction()}\n\t\tFunction:\n${sizeFunction}`, true);
        this.sizeFunction = sizeFunction;
    }

    #setViewportSize(width, height) {
        this.log(`setting viewport: ${[width, height]}`, true);
        this.gl.viewport(0, 0, width, height);
    }

    draw(drawToMain = false, size = null) {
        this.log('Drawing', true);
        //bind program
        this.gl.useProgram(this.program);

        this.currFramebuffer = Math.max(Math.min(this.currFramebuffer, this.framebuffers.length), 0);

        //bind framebuffer (or canvas)
        this.#setFrameBuffer(drawToMain);

        //set viewport
        this.#setViewportSize(...(size ? size : (this.sizeFunction ? this.sizeFunction() : this.size)));

        //clear the attachments
        this.gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.enableAttributes();
        this.enableUniforms();

        //draw arrays
        this.gl.drawArrays(this.type, this.startVertex, this.drawCount);

        this.disableUniforms();

        this.log('Drawn.', true);
    }

    #setFrameBuffer(drawToMain = null) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, drawToMain ? null : this.framebuffers[this.currFramebuffer].framebuffer);
    }

    enableAttributes() {
        this.attributes.forEach(attribute => {
            attribute.enable();
        });
    }

    enableUniforms() {
        this.uniforms.forEach(uniform => {
            uniform.enable();
        });
        this.renderTextures.forEach(tex => {
            tex.enable();
        });
    }

    disableUniforms() {
        this.uniforms.forEach(uniform => {
            uniform.disable();
        });

        this.renderTextures.forEach(tex => {
            tex.disable();
        });
    }

    static initShaderProgram(name, size, clearColor, object, vertexShaderSource, fragmentShaderSource, options) {
        var program = new GL_Program(gl, name, size, clearColor, options.debug ? options.debug : false);
    
        //create buffers
        program.setVertexBuffer(object.vertices);
        if(options.colors && object.colors)
            program.setColorBuffer(object.colors);
        if(options.uvs && object.uvs)
            program.setTextureCoords(object.uvs);
    
        //create shaders
        program.createVertexShader(vertexShaderSource);
        program.createFragmentShader(fragmentShaderSource);
    
        program.init();
    
        return program;
    }
}

class GL_Texture {
    constructor(gl, program, name, texSlot, glSlot, data = null, render = false, size = null, sampleType = null) {
        this.gl = gl;
        this.program = program;
        this.name = name;
        this.texSlot = texSlot;
        this.glSlot = glSlot;
        this.render = render;
        this.texture = null;
        this.location = this.gl.getUniformLocation(this.program, this.name);

        //temporarly fill with 2x2 colored pixels

        if(render)
            this.texture = data;
        else
            this.init((data ? data : 
                [255,0,0,255,
                0,255,0,255,
                0,0,255,255,
                0,0,0,255]),
                size ? size : [2,2],
                sampleType ? sampleType : this.gl.NEAREST
            );
    }

    init(textureData, size = [2, 2], sampleType = this.gl.NEAREST) {
        this.texture = this.gl.createTexture();

        this.gl.activeTexture(this.glSlot);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, sampleType ? sampleType : this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, sampleType ? sampleType : this.gl.NEAREST);

        var data = null;
        if(textureData && (textureData.length % 4) == 0) {
            data = new Uint8Array(textureData);
        }


        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            size[0],
            size[1],
            0,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            data
        );
    }

    enable(location = null, texSlot = null, glSlot = null) {
        if(!location)
            location = this.location;
        if(!texSlot)
            texSlot = this.texSlot;
        if(!glSlot)
            glSlot = this.glSlot;

        this.gl.activeTexture(glSlot);

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

        this.gl.uniform1i(location, texSlot);
    }

    disable() {
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
}

class GL_RenderTexture extends GL_Texture {
    constructor(gl, program, name, texSlot, glSlot, texture = null, sampleType = null) {
        super(gl, program, name, texSlot, glSlot, texture, true, null, sampleType);
    }

    init(size = null, sampleType = null) {
        super.init(null, size, sampleType);
    }

    setTexture(texture) {
        this.texture = texture;
    }
}

class GL_Uniform {
    static FLOAT = 0;
    static INT = 1;

    constructor(gl, program, size, type, name, data, valueFunction = null) {
        this.gl = gl;
        this.program = program;
        this.size = size;
        this.type = type;
        this.name = name;
        this.data = Array.isArray(data) ? data : [data];
        this.valueFunction = valueFunction;
        this.location = this.gl.getUniformLocation(this.program, this.name);

        this.convertData();
    }

    convertData() {
        if(this.size > 1)
            this.data = this.type == GL_Uniform.FLOAT ? new Float32Array(this.data) : new Int32Array(this.data);
    }

    enable() {
        if(this.valueFunction) {
            this.data = this.valueFunction();
            this.convertData();
        }
        if(this.type == GL_Uniform.FLOAT) { // floats
            switch (this.size) {
                default:
                case 1:
                    this.gl.uniform1fv(this.location, this.data);
                    break;
                case 2:
                    this.gl.uniform2fv(this.location, this.data);
                    break;
                case 3:
                    this.gl.uniform3fv(this.location, this.data);
                    break;
                case 4:
                    this.gl.uniform4fv(this.location, this.data);
                    break;
            }
        } else { // ints
            switch (this.size) {
                default:
                case 1:
                    this.gl.uniform1iv(this.location, this.data);
                    break;
                case 2:
                    this.gl.uniform2iv(this.location, this.data);
                    break;
                case 3:
                    this.gl.uniform3iv(this.location, this.data);
                    break;
                case 4:
                    this.gl.uniform4iv(this.location, this.data);
                    break;
            }
        }
    }

    disable() {}
}

class GL_Attribute {
    constructor(gl, program, bufferType, buffer, name, dataSize, dataType) {
        this.gl = gl;
        this.program = program;
        this.bufferType = bufferType;
        this.buffer = buffer;
        this.name = name;
        this.dataSize = dataSize;
        this.dataType = dataType;
        this.location = this.gl.getAttribLocation(this.program, this.name);
    }

    enable() {
        this.gl.bindBuffer(this.bufferType, this.buffer);
        this.gl.vertexAttribPointer(this.location, this.dataSize, this.dataType, false, 0, 0);
        this.gl.enableVertexAttribArray(this.location);
    }
}

class GL_Shader {
    constructor(gl, type, source) {
        this.gl = gl;
        this.shader = this.gl.createShader(type);
        this.gl.shaderSource(this.shader, source);
        this.gl.compileShader(this.shader);
        
        this.checkShaderError();
    }

    checkShaderError() {
        if (!this.gl.getShaderParameter(this.shader, this.gl.COMPILE_STATUS)) {
            console.error(this.gl.getShaderInfoLog(this.shader));
        }
    }
}

class GL_FrameBuffer {
    constructor(gl, program) {
        this.gl = gl;
        this.program = program;
        this.framebuffer = this.gl.createFramebuffer();
    }

    addTexture(textureObj) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);

        this.gl.framebufferTexture2D(
            this.gl.FRAMEBUFFER,
            this.gl.COLOR_ATTACHMENT0,
            this.gl.TEXTURE_2D,
            textureObj.texture,
            0
        );
        
        var status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
        if(status != this.gl.FRAMEBUFFER_COMPLETE)
            console.error(`Framebuffer not complete. Status: ${status}`);
    }
}





/* Objects */

class Vector {
    static Normalize(vector) {
        var vecLength = 0;
        vector.forEach(coord => {
            vecLength += coord * coord;
        });
        vecLength = Math.sqrt(vecLength);

        var newVector = [];
        vector.forEach(coord => {
            newVector.push(coord / (vecLength == 0 ? 1 : vecLength));
        });
        return newVector;
    }
}

class IcoObject {
    static defaultUvs = [
        0,0,
        1,0,
        0,1
    ];
    static defaultColors = [
        1,0,0,1,//r
        0,1,0,1,//g
        0,0,1,1,//b
        1,1,1,1 //w
    ];

    constructor(data) {
        this.vertices = data.vertices;
        this.colors = (data.colors ? data.colors : IcoObject.defaultColors);
        this.uvs = (data.uvs ? data.uvs : IcoObject.defaultUvs);
    }
}

class Icosahedron extends IcoObject {
    constructor(scale = null) {
        super({
            vertices: Icosahedron.unitVertices,
            colors: Icosahedron.unitColors,
            uvs: Icosahedron.unitUvs
        });
        if(scale)
            if(scale.length == 3)
                this.resize(scale);
            else
                console.error(`Scale (${scale}) is wrong size! It should be an array of length 3.`);
    }

    resize(scale = [1,1,1]) {
        var vertexData = Icosahedron.unitVertices;

        //scale object by multiplying each cordinate axis by its new scale
        for(var i = 0; i < vertexData.length/3; i++) {
            for(var j = 0; j < 3; j++) {
                var index = (i*3) + j;
                vertexData[index] =  vertexData[index] * scale[j];
            }
        }

        this.vertices = vertexData;
    }

    /*
     * Generates an Icosahedron using vertices from 3 rectangles laid
     * across each axis plane sized to the golden ratio.
     * Those vertices are then normalized to a unit sphere.
     */
    static unitUvs = null;
    static unitColors = null;
    static unitVertices = (() => {
        // get golden ratio where a = 1
        var width = 1;
        var length = (1 + Math.sqrt(5))/2;
        
        //Switching width and length breaks it in an interesting way
        //[width, length] = [length, width];

        var hw = width/2;
        var hl = length/2;

        //construct rectangles
        var rectX = [
            [hl, 0, hw],
            [hl, 0, -hw],
            [-hl, 0, hw],
            [-hl, 0, -hw]
        ];

        var rectY = [
            [hw, hl, 0],
            [hw, -hl, 0],
            [-hw, hl, 0],
            [-hw, -hl, 0]
        ];

        var rectZ = [
            [0, hw, hl],
            [0, hw, -hl],
            [0, -hw, hl],
            [0, -hw, -hl]
        ];

        //normalize the points to a unit sphere
        rectX.forEach((point, index, arr) => {
            arr[index] = Vector.Normalize(point);
        });
        rectY.forEach((point, index, arr) => {
            arr[index] = Vector.Normalize(point);
        });
        rectZ.forEach((point, index, arr) => {
            arr[index] = Vector.Normalize(point);
        });

        //construct icosahedron
        var vertexData = [];

        // Top
        //0: Y[2], Z[0], Y[0]
        vertexData.push(...rectY[2]);
        vertexData.push(...rectZ[0]);
        vertexData.push(...rectY[0]);
        //1: Y[0], Z[1], Y[2]
        vertexData.push(...rectY[0]);
        vertexData.push(...rectZ[1]);
        vertexData.push(...rectY[2]);
        
        // Middle Top
        //2: Y[0], Z[0], X[0]
        vertexData.push(...rectY[0]);
        vertexData.push(...rectZ[0]);
        vertexData.push(...rectX[0]);
        //3: Y[0], X[0], X[1]
        vertexData.push(...rectY[0]);
        vertexData.push(...rectX[0]);
        vertexData.push(...rectX[1]);
        //4: Y[0], X[1], Z[1]
        vertexData.push(...rectY[0]);
        vertexData.push(...rectX[1]);
        vertexData.push(...rectZ[1]);
        //5: Y[2], Z[1], X[3]
        vertexData.push(...rectY[2]);
        vertexData.push(...rectZ[1]);
        vertexData.push(...rectX[3]);
        //6: Y[2], X[3], X[2]
        vertexData.push(...rectY[2]);
        vertexData.push(...rectX[3]);
        vertexData.push(...rectX[2]);
        //7: Y[2], X[2], Z[0]
        vertexData.push(...rectY[2]);
        vertexData.push(...rectX[2]);
        vertexData.push(...rectZ[0]);

        // Middle
        //8:  Z[0], X[2], Z[2]
        vertexData.push(...rectZ[0]);
        vertexData.push(...rectX[2]);
        vertexData.push(...rectZ[2]);
        //9:  Z[0], Z[2], X[0]
        vertexData.push(...rectZ[0]);
        vertexData.push(...rectZ[2]);
        vertexData.push(...rectX[0]);
        //10: Z[1], X[1], Z[3]
        vertexData.push(...rectZ[1]);
        vertexData.push(...rectX[1]);
        vertexData.push(...rectZ[3]);
        //11: Z[1] ,Z[3], X[3]
        vertexData.push(...rectZ[1]);
        vertexData.push(...rectZ[3]);
        vertexData.push(...rectX[3]);

        // Middle Bottom
        //12: X[0], Z[2], Y[1]
        vertexData.push(...rectX[0]);
        vertexData.push(...rectZ[2]);
        vertexData.push(...rectY[1]);
        //13: X[1], X[0], Y[1]
        vertexData.push(...rectX[1]);
        vertexData.push(...rectX[0]);
        vertexData.push(...rectY[1]);
        //14: X[1], Y[1], Z[3]
        vertexData.push(...rectX[1]);
        vertexData.push(...rectY[1]);
        vertexData.push(...rectZ[3]);
        //15: Z[3], Y[3], X[3]
        vertexData.push(...rectZ[3]);
        vertexData.push(...rectY[3]);
        vertexData.push(...rectX[3]);
        //16: X[2], X[3], Y[3]
        vertexData.push(...rectX[2]);
        vertexData.push(...rectX[3]);
        vertexData.push(...rectY[3]);
        //17: X[2], Y[3], Z[2]
        vertexData.push(...rectX[2]);
        vertexData.push(...rectY[3]);
        vertexData.push(...rectZ[2]);

        // Bottom
        //18: Z[2], Y[3], Y[1]
        vertexData.push(...rectZ[2]);
        vertexData.push(...rectY[3]);
        vertexData.push(...rectY[1]);
        //19: Z[3], Y[1], Y[3]
        vertexData.push(...rectZ[3]);
        vertexData.push(...rectY[1]);
        vertexData.push(...rectY[3]);

        var uvData = [];
        var colorData = [];

        //scale object and add default uvs and color
        for(var i = 0; i < vertexData.length/3; i++) {
            uvData.push(...IcoObject.defaultUvs);
            colorData.push(...IcoObject.defaultColors);
        }

        Icosahedron.unitUvs = uvData;
        Icosahedron.unitColors = colorData;

        return vertexData;
    })();
}

class Rectangle {
    constructor(vertices, colors, uvs) {
        this.vertices = vertices;
        this.colors = colors;
        this.uvs = uvs;
    }

    // scale of 1 will be fullscreen
    static Centered(scale = 1) {
        //flat rectangle covering screen
        var uniqueVertices = [
            -1, -1, 0, //bottom left
            -1, 1, 0,  //top left
            1, -1, 0,  //bottom right
            1, 1, 0,   //top right
        ];

        uniqueVertices.forEach((v, i, arr) => {
            arr[i] = v * scale;
        });

        var uniqueColors = [
            1, 0, 0, 1, //red
            0, 1, 0, 1, //green
            0, 0, 1, 1, //blue
            0, 0, 0, 1  //black
        ];
    
        var uniqueTextureCoords = [
            0, 0, //bottom left
            0, 1, //top left
            1, 0, //bottom right
            1, 1  //top right
        ];
        
        var indices = [
            0, 1, 2, //bottom left triangle
            3, 2, 1  //top right triangle
        ];

        var vertices = [];
        var colors = [];
        var uvs = [];
        indices.forEach(index => {
            var iC = index * 4;
            var iV = index * 3;
            var iT = index * 2;

            vertices.push(uniqueVertices[iV]);
            vertices.push(uniqueVertices[iV + 1]);
            vertices.push(uniqueVertices[iV + 2]);

            colors.push(uniqueColors[iC]);
            colors.push(uniqueColors[iC + 1]);
            colors.push(uniqueColors[iC + 2]);
            colors.push(uniqueColors[iC + 3]);

            uvs.push(uniqueTextureCoords[iT]);
            uvs.push(uniqueTextureCoords[iT + 1]);
        });

        return new Rectangle(vertices, colors, uvs);
    }
}

class Circle {
    constructor(pos, radius) {
        this.pos = pos;
        this.radius = radius;
    }
}

class Sphere extends Circle {
    constructor(pos, radius) {
        super(pos, radius);
    }
}