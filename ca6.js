"use strict";
// Create The global namespace
var CA6 = CA6 || {}; 

var ca6 = function (canvas_id,params) {
  // Constructor - Responsive animated hexoganal grid
  // Written by Jason Weirather 2016
  //   This constructor is written with cellular automata in mind,
  //   but may serve a variety of animation purposes.

  // Pre: Requires the element id of a canvas
  //      (optional) a parameters object that contains
  //                 values for some grid properties

  // Interface
  // init() -- create the toroidal matrix should be run before drawing
  // draw_grid() -- will draw the background grid onto the canvas
  // row_count() -- return the number of rows on the current canvas
  // column_count() -- given a row number (index 0) return the column count
  // fill_hexagon() -- given a grid position fill this hexagon with a color
  var self, params, default_params, con, hexagon, mouse, mat;
  var mainloop, clear, row_col_to_coord;
  var update_mouse_position, coord_to_row_col, ToroidalMatrix, Cell; 
  var point_distance, resize_listener, last_dimensions, do_resize;
  var use_mouse, counter;
  var hexagon_grid;

  use_mouse = false;
  counter = 0;
  mouse = {x:0,y:0,m:0,n:0,last_m:0,last_n:0,used:true};
  default_params = {
    hexagon_size:20,
    inner_padding:1,
    grid_lwd:1,
    grid_color:'rgba(255,190,0,0.1)',
    default_color:'rgba(200,200,200,0.3)',
    fade_in:0.05,
    fade_out:0.01,
    canvas:document.getElementById(canvas_id),
    context:document.getElementById(canvas_id).getContext("2d"),
  };
  if (typeof in_params==='undefined') params = default_params;

  self = this;

  con = {
    c6:Math.cos(Math.PI/6),
    s6:Math.sin(Math.PI/6),
  }

  // begin internal functions
  clear = function () {
    params.context.save();
    params.context.clearRect(0,0,params.canvas.width,params.canvas.height);
    params.context.restore();
  }
  ToroidalMatrix = function () {//(m,n) {
    var i, marr, narr, empty, self2, n;
    this.val = [];
    this.m = function () {
      return self.row_count();
    }
    //The rows must even be whether or not it puts us a bit off canvas on the wrap
    //if(m%2==1) m+=1;
    //else m+=2;
    self2 = this;
    for (i = 0; i < this.m(); i+=1) {
      narr = [];
      n = self.col_count(i);
      for (j = 0; j < n; j+=1) {
        narr.push(new Cell(i,narr.length));
      }
      this.val.push(narr);
    }
    this.get_cells = function () {
      var cells, i, j;
      // return an array of all cells
      cells = [];
      for (i = 0; i < self2.val.length; i += 1) {
        for (j = 0; j < self2.val[i].length; j += 1) {
          cells.push(self2.val[i][j]);
        }
      }
      return cells;
    }
    this.fetch = function (m,n) {
      return self2.val[m%(self.row_count())][n%(self.col_count(m))];
    }
    this.fill_hexagon = function (m,n,color) {
      var values, ms, ns, i, j, xcross, mact;
      values = [];
      ms = [];
      ns = [];
      //console.log(n+'--'+self2.val[m].length);
      mact = m;
      if (m===0 || m >= self2.m()) {
        ms.push(0);
        ms.push(self2.m());
        mact = 0;
      } else ms.push(m);
      //xcross = params.canvas.width/((params.hexagon_size/2)*Math.sqrt(3));
      //xcross = xcross - Math.floor(xcross);
      if(mact >= self2.val.length) mact = self2.val.length-1;
      if (n===0 || n >= self2.val[mact].length) {
          ns.push(0);
          ns.push(self2.val[mact].length);
      } else ns.push(n);
      for(i = 0; i < ms.length; i+=1) {
        for(j = 0; j < ns.length; j+=1) {
          self.fill_hexagon(ms[i],ns[j],color);
        }
      }
    }
  }
  Cell = function (m,n,in_color) {
    var color, self2;
    color = in_color || params.default_color;
    this.live = false;
    this.alpha = 0;
    self2 = this;
    this.draw = function () {
      params.context.save();
      params.context.globalAlpha = self2.alpha;
      self.mat.fill_hexagon(m,n,color);
      params.context.restore();
    }
    this.turn_on = function () {
      self2.live = true;
    }
    this.turn_off = function () {
      self2.live = false;
    }
    this.tick = function () {
      if(this.live) {
        this.alpha += params.fade_in;
        if(this.alpha > 1) this.alpha = 1;
      } else {
        this.alpha -= params.fade_out;
        if(this.alpha < 0) this.alpha = 0;
      }
    }
  }
  point_distance = function(c1,c2) {
    var v1,v2;
    v1 = c2.x-c1.x;
    v2 = c2.y-c1.y;
    return Math.sqrt(v1*v1+v2*v2);
  }
  resize_listener = function (in_canvas, prev) {
    //console.log(last_dimensions.height);
    if (in_canvas.height !== prev.height || in_canvas.width !== prev.width) {
      do_resize();
    }
    prev = {height:in_canvas.height,width:in_canvas.width};
  }
  do_resize = function () {
    var i,curr;
    //console.log(self.mat.val.length+','+self.row_count());
    while(self.mat.val.length < self.row_count()) {
      self.mat.val.push([]);
    }
    for (i = 0; i < self.row_count(); i +=1) {
      while(self.mat.val[i].length < self.col_count(i)) {
        curr = self.mat.val[0].length;
        self.mat.val[i].push(new Cell(i,curr));
      }
    }
    //draw_grid();
  }
  update_mouse_position = function (e) {
    var loc;
    mouse.last_m = mouse.m;
    mouse.last_n = mouse.n;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    loc = coord_to_row_col(mouse.x,mouse.y);
    if (loc.m!==mouse.last_m || loc.n!==mouse.last_n) {
      mouse.used=false;
    }
    mouse.m = loc.m;
    mouse.n = loc.n;
    //console.log(mouse.x+','+mouse.y+'  '+mouse.m+','+mouse.n)
  }
  coord_to_row_col = function(x,y) { // canvas coordinate to m n fo hexagon
    var r,d, m_approx, n_approx, n_init,i,j,ms,ns, coord;
    var best_dist,dist,best_m_offset, best_n_offset, m0, m1;
    r = params.hexagon_size/2; // radius of circle
    d = r*Math.sqrt(3);
    m_approx = Math.round(y/(r*1.5));
    n_init = 0;
    if(m_approx%2==1) n_init=0.5;
    n_approx = Math.round((x/d)-n_init);
    // now we should find out if we can get a more exact value
    coord = {x:x,y:y};
    m0 = row_col_to_coord(m_approx,n_approx);
    best_dist = point_distance(coord,m0);
    //only check hard on boundaries
    if(best_dist < d/2-1) { return {m:m_approx,n:n_approx}; }
    //console.log('check best')
    best_m_offset = 0;
    best_n_offset = 0;
    ms = [-1,0,1];
    ns = [-1,0,1];
    // we have to check surrounding values but it should be more exact
    for (i = 0; i < ms.length; i +=1) {
      for (j = 0; j < ns.length; j += 1) {
        if (i===1 && j === 1) continue; // default case
        m1 = row_col_to_coord(m_approx+ms[i],n_approx+ns[j]);
        dist = point_distance(coord,m1);
        if(dist < best_dist) {
          best_m_offset = ms[i];
          best_n_offset = ns[j];
          best_dist = dist;
        }
      }
    }
    return {m:m_approx+best_m_offset,n:n_approx+best_n_offset}
  }
  row_col_to_coord = function(m,n) {
    var r,d, n_init;
    r = params.hexagon_size/2; // radius of circle
    d = r*Math.sqrt(3);
    n_init = 0;
    if(m%2==1) n_init=0.5;
    return {y:r*1.5*m,x:d*n+n_init*d};
  }

  hexagon_grid = function (x,y,r,ctx) {
    var rc6, rs6;
    rc6 = r*con.c6; // r*cos(pi/6)
    rs6 = r*con.s6;  // r*sin(pi/6)
    ctx.moveTo(x+rc6,y-rs6);
    ctx.lineTo(x+rc6,y+rs6);
    ctx.lineTo(x,y+r);
    ctx.lineTo(x-rc6,y+rs6);
    //ctx.lineTo(x-rc6,y-rs6);
    //ctx.lineTo(x,y-r);
    //ctx.lineTo(x+rc6,y-rs6);
    ctx.stroke();
  }

  this.draw_grid = function () {
    // Draw the hexagon shaped grid onto the canvas
    var row_num, column_num, m, n, ctx, pos, r, n_init,d, rc6, rs6;
    ctx = params.context;
    pos = {x:0,y:0};
    r = params.hexagon_size/2; // radius of circle
    d = r*Math.sqrt(3);
    row_num = self.row_count();
    column_num = self.col_count();
    ctx.save();
    ctx.lineWidth=params.grid_lwd;
    for (m = 0; m <= row_num; m+=1) {
      n_init = 0;
      if(m%2==1) n_init=0.5;
      for(n = n_init; n <= column_num+1; n+=1) {
        ctx.beginPath();
        //console.log(n*column_step);
        ctx.strokeStyle=params.grid_color;
        pos.x = n*d;
        pos.y = m*(r*1.5);
        hexagon_grid(pos.x,pos.y,r,ctx)
      }
    }
    ctx.restore();
  }
  
  mainloop = function () {
    var cell, cells, i;
    self.counter +=1;
    //if(self.counter%4==1) {
    //  requestAnimationFrame(mainloop); // skip out every other frame
    //  return;
    //}
    clear();
    self.draw_grid();
    if(use_mouse && !mouse.used) {
      mouse.used = true;
      cell = self.mat.fetch(mouse.m,mouse.n);

      if(cell.live) cell.turn_off();
      else cell.turn_on();
      //self.mat.fill_hexagon(mouse.m,mouse.n,params.default_color);
    }
    cells = self.mat.get_cells();
    for (i = 0; i < cells.length; i+=1) {
      cells[i].tick();
      if(cells[i].alpha > 0) cells[i].draw();
    }
    requestAnimationFrame(mainloop)
  }
  // begin external functions
  this.init = function () {
    //console.log(params.canvas.width+' width')
    //console.log(params.canvas.height+' height')
    self.mat = new ToroidalMatrix();//self.row_count(),self.col_count());
    // set up the resize listener
    last_dimensions = {height:params.canvas.height,width:params.canvas.width};
    (function () { setInterval(resize_listener,500,params.canvas,last_dimensions); })();  // poll for resize
  };
  // add the mouse listener
  this.add_mouse_listener = function () {
    use_mouse = true;
    params.canvas.addEventListener('mousemove',function(e) { update_mouse_position(e)});
  }
  // run the animation functions
  this.run_animation = function () {
    mainloop();
  }
  this.row_count = function () {
    // row count is defined by the values of the canvas and hexagon size
    var row_count, xcross, extra,r,d;
    xcross = params.canvas.height/((params.hexagon_size/2)*1.5);
    xcross = xcross - Math.floor(xcross);
    r = params.hexagon_size/2; // radius of circle
    d = r*Math.sqrt(3);
    extra = 0;
    //console.log(xcross+'^'+Math.sqrt(3)/2);
    //if (xcross > 0.5) extra = 2;
    //row_count = params.canvas.height/((params.hexagon_size/2)*1.5);
    row_count = (params.canvas.height+d/2)/((params.hexagon_size/2)*1.5);
    if(Math.floor(row_count)%2==1) row_count +=1;
    return Math.floor(row_count)+extra;
  }
  this.col_count = function (m) {
    var xcross, extra;
    // column count while defined by canvas and hexagon size
    // differs depending on which row you are on
    xcross = params.canvas.width/((params.hexagon_size/2)*Math.sqrt(3));
    xcross = xcross - Math.floor(xcross);
    extra = 0;
    if (m%2===0 && xcross > 0.5) {
      extra = 1;
    } else if (m%2===0 && xcross <= 0.5) {
      extra = 1;
    }
    return Math.floor(params.canvas.width/((params.hexagon_size/2)*Math.sqrt(3)))+extra;
  }
  this.fill_hexagon = function(m,n,color) {
    var rc6, rs6, ctx, x, y, r, c;
    color = color || '#FF0000';
    c = row_col_to_coord(m,n);
    ctx = params.context;
    ctx.save();
    r = (params.hexagon_size/2)-params.inner_padding; // radius of circle
    rc6 = r*con.c6; // r*cos(pi/6)
    rs6 = r*con.s6;  // r*sin(pi/6)
    ctx.beginPath();
    ctx.moveTo(c.x+rc6,c.y+rs6);
    ctx.lineTo(c.x+rc6,c.y+rs6);
    ctx.lineTo(c.x,c.y+r);
    ctx.lineTo(c.x-rc6,c.y+rs6);
    ctx.lineTo(c.x-rc6,c.y-rs6);
    ctx.lineTo(c.x,c.y-r);
    ctx.lineTo(c.x+rc6,c.y-rs6);
    ctx.closePath();
    ctx.fillStyle=color;
    ctx.fill();
    ctx.restore();
  }

};
