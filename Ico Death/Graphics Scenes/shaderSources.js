/* SDFs */
const SDFVertexSource =
`
attribute vec3 a_position;
attribute vec2 a_texcoord;

varying vec2 v_ST;

void main() {
    v_ST = a_texcoord;
    gl_Position = vec4(a_position, 1);
}
`;

const SDFFragmentSource =
`precision highp float;

varying vec2 v_ST;

vec2 pos;

float circleSdf(vec2 objPos, float objRad) {
    return length(objPos - pos) - objRad;
}

void main() {
    pos = v_ST;
    float radius = 0.25;
    vec2 objPos = vec2(0.5,0.5);
    float sdfValue = circleSdf(objPos, radius);//or min of multiple

    float brightness = 0.3;
    vec3 backgroundColor = vec3(1,0.5,1) * brightness;
    vec3 circleColor = vec3(1,0,0) * brightness;
    vec3 borderColor = vec3(0,0,0) * brightness;
    float borderRadius = 0.001;
    vec3 color = abs(sdfValue) <= borderRadius ? borderColor : (sdfValue < 0. ? circleColor : backgroundColor);
    
    gl_FragColor = vec4(color,1);
}`;

/* Voronoi Noise */
const voronoiVertexSource =
`
attribute vec3 a_position;
attribute vec2 a_texcoord;

varying vec2 v_ST;

uniform vec2 u_viewRatio;

void main() {
    v_ST = a_texcoord * u_viewRatio;
    gl_Position = vec4(a_position, 1);
}
`;

const voronoiFragmentSource =
`precision highp float;

varying vec2 v_ST;

uniform vec2 u_viewOffset;
uniform float u_cellDensity;
uniform float u_scatterPower; // 0-1
uniform float u_borderWidth;
uniform float u_borderTol;
uniform vec3 u_borderColor;


float rand(float x) {
    return fract(sin(x)*100000.0);
}

float rand(vec2 pos) {
    return fract(sin(dot(pos, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 randColor(float x) {
    float r = rand(x);
    float g = rand(r);
    float b = rand(g);
    return vec3(r,g,b);
}

vec2 cellPoint(vec2 pos) {
    float cellSize = 1. / u_cellDensity;
    float ang = 360. * rand(pos);
    float dist = max(0., min(1., u_scatterPower)) * rand(pos.yx);
    return vec2(dist * cos(ang), dist * sin(ang));
}

vec4 voronoi(vec2 pos) {
    vec2 mainCell = floor(pos);

    float minDist = 10.;
    vec2 minCell;
    vec2 toMinCell;
    for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
            vec2 cell = mainCell + vec2(x,y);
            vec2 cellPointPos = cell + cellPoint(cell) + 0.5;
            vec2 toCell = cellPointPos - pos;
            float cellDist = length(toCell);
            if(cellDist < minDist) {
                minDist = cellDist;
                minCell = cell;
                toMinCell = toCell;
            }
        }
    }

    float minEdgeDist = 10.;
    vec2 minEdgePoint;
    for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
            vec2 cell = mainCell + vec2(x,y);

            vec2 diffToClosestCell = abs(minCell - cell);
            bool isClosestCell = diffToClosestCell.x + diffToClosestCell.y < 0.1;
            if(isClosestCell) continue;

            vec2 cellPointPos = cell + cellPoint(cell) + 0.5;
            vec2 toCell = cellPointPos - pos;

            vec2 edgePos = (toMinCell + toCell) / 2.; // might not need - pos
            vec2 borderPerp = normalize(toCell - toMinCell);
            
            float distToEdge = dot(edgePos, borderPerp);
            if(distToEdge < minEdgeDist) {
                minEdgeDist = distToEdge;
                minEdgePoint = toCell;
            }
        }
    }

    return vec4(minDist, minCell, minEdgeDist);
}

void main() {
    vec2 samplePos = v_ST * u_cellDensity + u_viewOffset;

    vec4 noise = voronoi(samplePos);
    vec3 cellColor = randColor(rand(noise.yz));
    float isBorder = 1. - smoothstep(u_borderWidth, u_borderWidth + u_borderTol, noise.w);

    //vec3 color = vec3(noise.w);
    vec3 color = mix(cellColor, u_borderColor, isBorder);
    
    gl_FragColor = vec4(color,1);
}`;

/* Experiments */
const brokenVoronoi =
`precision highp float;

varying vec2 v_ST;

uniform vec2 u_viewOffset;
uniform float u_cellDensity;
//uniform float u_minCellsForBorder;

float rand(float x) {
    return fract(sin(x)*100000.0);
}

float rand(vec2 pos) {
    return (rand(pow(pos.x, 7.263)) + rand(pow(pos.y, 3.926))) / 2.;
}

vec2 cellPoint(vec2 pos) {
    float cellSize = 1. / u_cellDensity;
    float ang = 360. * rand(pos);
    float dist = 0.5 * rand(pos.yx);
    return vec2(dist * cos(ang), dist * sin(ang));
}

float voronoi(vec2 pos) {
    vec2 cell = floor(pos);
    vec2 cellPos = cell + cellPoint(cell) + 0.5;
    float dist = length(cellPos - pos);

    return dist;
}

void main() {
    vec2 samplePos = v_ST * u_cellDensity + u_viewOffset;

    float minDist = 10.;
    vec2 minCell;
    for(int y = -1; y <= 1; y++) {
        for(int x = -1; x <= 1; x++) {
            float cellDist = voronoi(samplePos + vec2(x,y));
            if(cellDist < minDist) {
                minDist = cellDist;
                minCell = samplePos + vec2(x,y);
            }
        }
    }
    float color = rand(minCell);
    
    gl_FragColor = vec4(vec3(color),1);
}`;
