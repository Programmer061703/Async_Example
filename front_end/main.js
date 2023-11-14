"use strict";
const random_id = (len) => {
    let p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return [...Array(len)].reduce(a => a + p[Math.floor(Math.random() * p.length)], '');
};
const g_origin = new URL(window.location.href).origin;
const g_id = random_id(12);
// Payload is a marshaled (but not JSON-stringified) object
// A JSON-parsed response object will be passed to the callback
const httpPost = (page_name, payload, callback) => {
    let request = new XMLHttpRequest();
    request.onreadystatechange = () => {
        if (request.readyState === 4) {
            if (request.status === 200) {
                let response_obj;
                try {
                    response_obj = JSON.parse(request.responseText);
                }
                catch (err) { }
                if (response_obj) {
                    callback(response_obj);
                }
                else {
                    callback({
                        status: 'error',
                        message: 'response is not valid JSON',
                        response: request.responseText,
                    });
                }
            }
            else {
                if (request.status === 0 && request.statusText.length === 0) {
                    callback({
                        status: 'error',
                        message: 'connection failed',
                    });
                }
                else {
                    callback({
                        status: 'error',
                        message: `server returned status ${request.status}: ${request.statusText}`,
                    });
                }
            }
        }
    };
    request.open('post', `${g_origin}/${page_name}`, true);
    request.setRequestHeader('Content-Type', 'application/json');
    request.send(JSON.stringify(payload));
};
class Sprite {
    x;
    y;
    id;
    speed;
    image;
    update;
    onclick;
    dest_x;
    dest_y;
    constructor(x, y, id, image_url, update_method, onclick_method) {
        this.x = x;
        this.y = y;
        this.speed = 4;
        this.id = id;
        this.image = new Image();
        this.image.src = image_url;
        this.update = update_method;
        this.onclick = onclick_method;
    }
    set_destination(x, y) {
        this.dest_x = x;
        this.dest_y = y;
    }
    ignore_click(x, y) {
    }
    move(dx, dy) {
        if (this.dest_x !== undefined && this.dest_y !== undefined) {
            this.dest_x = this.x + dx;
            this.dest_y = this.y + dy;
        }
    }
    go_toward_destination() {
        if (this.dest_x === undefined || this.dest_y === undefined)
            return;
        if (this.x < this.dest_x)
            this.x += Math.min(this.dest_x - this.x, this.speed);
        else if (this.x > this.dest_x)
            this.x -= Math.min(this.x - this.dest_x, this.speed);
        if (this.y < this.dest_y)
            this.y += Math.min(this.dest_y - this.y, this.speed);
        else if (this.y > this.dest_y)
            this.y -= Math.min(this.y - this.dest_y, this.speed);
    }
    sit_still() {
    }
}
class Model {
    sprites;
    turtle;
    constructor() {
        this.sprites = [];
        this.turtle = new Sprite(50, 50, g_id, "green_robot.png", () => this.turtle.go_toward_destination(), (x, y) => this.turtle.set_destination(x, y));
        console.log(`g_id=${g_id}`);
        this.sprites.push(this.turtle);
    }
    update() {
        //console.log('------------------');
        for (const sprite of this.sprites) {
            sprite.update();
            console.log(`id=${sprite.id}`);
            console.log(`x=${sprite.dest_x}`);
            console.log(`y=${sprite.dest_y}`);
        }
    }
    onclick(x, y) {
        for (const sprite of this.sprites) {
            sprite.onclick(x, y);
        }
    }
    move(dx, dy) {
        this.turtle.move(dx, dy);
        if (this.turtle.x == dx && this.turtle.y == dy) {
            window.open("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
        }
    }
}
class View {
    model;
    canvas;
    turtle;
    constructor(model) {
        this.model = model;
        this.canvas = document.getElementById("myCanvas");
        this.turtle = new Image();
        this.turtle.src = "turtle.png";
    }
    update() {
        const ctx = this.canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, 1000, 500);
            for (const sprite of this.model.sprites) {
                ctx.drawImage(sprite.image, sprite.x - sprite.image.width / 2, sprite.y - sprite.image.height);
            }
        }
    }
}
class Controller {
    model;
    view;
    key_right;
    key_left;
    key_up;
    key_down;
    last_updates_request_time = 0;
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.key_right = false;
        this.key_left = false;
        this.key_up = false;
        this.key_down = false;
        const self = this;
        this.last_updates_request_time = 0;
        view.canvas.addEventListener("click", (event) => { self.onClick(event); });
        document.addEventListener('keydown', (event) => { self.keyDown(event); }, false);
        document.addEventListener('keyup', (event) => { self.keyUp(event); }, false);
    }
    onClick(event) {
        const x = event.pageX - this.view.canvas.offsetLeft;
        const y = event.pageY - this.view.canvas.offsetTop;
        this.model.onclick(x, y);
        this.model.turtle.set_destination(x, y);
        //this.model.turtle.go_toward_destination();
        httpPost('ajax.html', {
            id: g_id,
            action: 'clicked',
            x: x,
            y: y,
        }, this.onAcknowledgeClick);
    }
    keyDown(event) {
        if (event.key === 'ArrowRight')
            this.key_right = true;
        else if (event.key === 'ArrowLeft')
            this.key_left = true;
        else if (event.key === 'ArrowUp')
            this.key_up = true;
        else if (event.key === 'ArrowDown')
            this.key_down = true;
    }
    keyUp(event) {
        if (event.key === 'ArrowRight')
            this.key_right = false;
        else if (event.key === 'ArrowLeft')
            this.key_left = false;
        else if (event.key === 'ArrowUp')
            this.key_up = false;
        else if (event.key === 'ArrowDown')
            this.key_down = false;
    }
    update() {
        let dx = 0;
        let dy = 0;
        const speed = this.model.turtle.speed;
        if (this.key_right)
            dx += speed;
        if (this.key_left)
            dx -= speed;
        if (this.key_up)
            dy -= speed;
        if (this.key_down)
            dy += speed;
        if (dx != 0 || dy != 0)
            this.model.move(dx, dy);
        const time = Date.now();
        if (time - this.last_updates_request_time >= 1000) {
            this.last_updates_request_time = time;
            // Send a request to the server for updates
            httpPost('ajax.html', {
                id: g_id,
                action: 'updates',
            }, this.updateFront);
        }
    }
    onAcknowledgeClick(ob) {
        console.log(`Response to move: ${JSON.stringify(ob)}`);
    }
    /*
    {
        Format of the response object:
        "updates": [
            [id, x, y],
            [id, x, y],
            ...
        ]
    */
    updateFront = (ob) => {
        if (ob.updates.length > 0)
            console.log(`Response to move: ${JSON.stringify(ob)}`);
        if (ob.updates) {
            for (let i = 0; i < ob.updates.length; i++) {
                let bool = false;
                let found = 0;
                // Checks to see if the robot already exists
                for (let j = 0; j < this.model.sprites.length; j++) {
                    //If statment checks the generated ID with the ID of the robot stored on the server
                    //If Robot does not exist then the bool will remain false
                    //If Robot does exist then the bool will be true and the index of the robot will be stored in found
                    //ID of sprites is declared in the constructor of the Sprite class
                    if (this.model.sprites[j].id === ob.updates[i][0]) {
                        bool = true;
                        found = j;
                    }
                }
                //If the robot does not exist then a new robot will be created
                if (!bool) {
                    console.log("Make New Robot");
                    this.model.sprites.push(new Sprite(0, 0, ob.updates[i][0], "blue_robot.png", Sprite.prototype.go_toward_destination, (x, y) => this.model.turtle.set_destination(x, y)));
                    console.log(`id=${ob.updates[i][0]}`);
                    this.model.sprites[this.model.sprites.length - 1].dest_x = ob.updates[i][1];
                    this.model.sprites[this.model.sprites.length - 1].dest_y = ob.updates[i][2];
                    //If the robot does exist then the robot will be moved to the new location based off of the found index
                }
                else {
                    let sprite = this.model.sprites[found];
                    let dx = ob.updates[i][1];
                    let dy = ob.updates[i][2];
                    sprite.set_destination(dx, dy);
                }
            }
        }
    };
}
class Game {
    model;
    view;
    controller;
    constructor() {
        this.model = new Model();
        this.view = new View(this.model);
        this.controller = new Controller(this.model, this.view);
    }
    onTimer() {
        this.controller.update();
        this.model.update();
        this.view.update();
    }
}
const game = new Game();
const timer = setInterval(() => { game.onTimer(); }, 40);
