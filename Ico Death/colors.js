class Palette {
    constructor() {
        this.precision = 4;
        this.base = {
            transparent: [0,0,0,0],
            white: [1,1,1,1],
            black: [0,0,0,1],
            grey: [0.5,0.5,0.5,1],
            red: [1,0,0,1],
            green: [0,1,0,1],
            blue: [0,0,1,1],
            yellow: [1,1,0,1],
            purple: [1,0,1,1],
            cyan: [0,1,1,1]
        }
        this.custom = {};
    }

    _01_to_255(color) {
        var output = [];
        color.forEach(value => {
            output.push(Math.max(Math.min(value * 255, 255), 0));
        });
        return this.#parseColor(output);
    }

    _255_to_01(color) {
        var output = [];
        color.forEach(value => {
            output.push(Math.max(Math.min(value / 255, 1), 0));
        });
        return this.#parseColor(output);
    }

    getAllNames() {
        return Object.keys(this.base).concat(this.getCustomNames());
    }

    getCustomNames() {
        return Object.keys(this.custom);
    }

    /* Never returns transparent because it never selects index 0 */
    getRandomBaseColor() {
        var keys = Object.keys(this.base);
        return this.base[keys[(Math.random() * (keys.length - 1) << 0) + 1]];
    }

    getRandomCustomColor() {
        var keys = Object.keys(this.custom);
        if(keys.length <= 0) {
            console.error('Attempted to get a random color from an empty palette. Returning cyan.');
            return this.base.cyan;
        }

        return this.custom[keys[Math.random() * keys.length << 0]];
    }

    addColor(name, color) {
        this.custom[name] = this.#parseColor(color);
    }

    addColors(colorObjects) {
        var keys = Object.keys(colorObjects);
        for(var i = 0; i < keys.length; i++) {
            this.custom[keys[i]] = this.#parseColor(colorObjects[keys[i]]);
        }
    }

    #parseColor(color) {
        var output = [];
        color.forEach(value => {
            output.push(parseFloat(value.toFixed(this.precision)));
        });
        return output;
    }

    removeColor(name) {
        if(name in this.custom) {
            try {
                delete this.custom[name];
            } catch {
                console.error(`An error occured when attempting to remove the color ${name} from the palette.`);
                alert(`An error occured when attempting to remove the color ${name} from the palette.`);
            }
        }
    }
}