"use strict";
// global namespace, use existing if there is one
var CA6 = CA6 || {}; 

CA6.Grid = function (canvas_id,params) {
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
  var update_mouse_position, coord_to_row_col, Cell; 
  var point_distance, resize_listener, last_dimensions;
  var use_mouse, counter;
  var hexagon_grid;
  var grid_offset;
  use_mouse = false;
  counter = 0;
  grid_offset = {x:0,y:0}; // grid is offset by this much
  mouse = {x:0,y:0,m:0,n:0,last_m:0,last_n:0,used:true};
  default_params = {
    hexagon_size:60,
    inner_padding:1,
    grid_lwd:1,
    grid_color:'rgba(255,190,0,0.1)',
    default_color:'rgba(200,200,200,0.3)',
    fade_in:0.05,
    fade_out:0.01,
    canvas:document.getElementById(canvas_id),
    context:document.getElementById(canvas_id).getContext("2d"),
  };
  this.params = default_params;
  if (typeof in_params!=='undefined') this.params = in_params;

  self = this;

  con = {
    c6:Math.cos(Math.PI/6),
    s6:Math.sin(Math.PI/6),
  }

  // begin internal functions
  clear = function () {
    self.params.context.save();
    self.params.context.clearRect(0,0,self.params.canvas.width,self.params.canvas.height);
    self.params.context.restore();
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
      self.do_resize();
    }
    prev = {height:in_canvas.height,width:in_canvas.width};
  }
  this.do_resize = function () {
    var i,curr;
    //console.log(self.mat.val.length+','+self.row_count());
    while(self.mat.val.length < self.row_count()) {
      self.mat.val.push([]);
    }
    for (i = 0; i < self.row_count(); i +=1) {
      while(self.mat.val[i].length < self.col_count(i)) {
        curr = self.mat.val[i].length;
        self.mat.val[i].push(new CA6.Cell(i,curr,self));
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
    x -= grid_offset.x;
    y -= grid_offset.y;
    r = self.params.hexagon_size/2; // radius of circle
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
    r = self.params.hexagon_size/2; // radius of circle
    d = r*Math.sqrt(3);
    n_init = 0;
    //yoff = grid_offset.y%self.col_count(self.row_count()-1);
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
    var max_row, max_col, mat_row, mat_col;
    var yoff, xoff;
    var row_offset2;
    ctx = self.params.context;
    r = self.params.hexagon_size/2; // radius of circle
    d = r*Math.sqrt(3);
    row_num = self.row_count();
    column_num = self.col_count();
    ctx.save();
    ctx.lineWidth=self.params.grid_lwd;
    for (m = -2; m < row_num+3; m+=1) {
      n_init = 0.5;
      if(m%2==0) n_init = 0;
      for(n = -2+n_init; n <= column_num+2; n+=1) {
        ctx.beginPath();
        ctx.strokeStyle=self.params.grid_color;
        pos = self.row_col_to_canvas_coord(m,n); //convert a matrix coordinate to a canvas coord
        hexagon_grid(pos.x,pos.y,r,ctx)
      }
    }
    ctx.restore();
  }
  this.row_col_to_canvas_coord = function (m,n) {
    var r, d, pos, n_init, yoff, xoff;
    r = self.params.hexagon_size/2; // radius of circle
    d = r*Math.sqrt(3);
    pos = {x:0,y:0};
    yoff = grid_offset.y%(2*r*1.5)
    pos.y = m*(r*1.5)+yoff;
    n_init = 0.5;
    if(m%2==0) n_init = 0;
    xoff = grid_offset.x%(d);
    pos.x = n*d+xoff;
    return pos
  }
  this.row_col_to_canvas_coord2 = function (m,n) {
    // return array of squares that match
    var r, d, pos, n_init, yoff, xoff, xset, cwid, rwid;
    r = self.params.hexagon_size/2; // radius of circle
    d = r*Math.sqrt(3);
    pos = {x:0,y:0};
    rwid = self.row_count()*r*1.5;
    yoff = grid_offset.y%(rwid);
    pos.y = m*(r*1.5)+yoff;
    if (pos.y > rwid) {
      pos.y -= rwid;
    }
    n_init = 0;

    //if (m%2==1) { n_init=0.5; }
    //xset = n*d+grid_offset.x%(d*self.col_count(m))+d*n_init;
    //if(xset > d*(self.col_count(m))) {
    //  xset -= d*self.col_count(m)+(d*2*n_init);
    //}
    cwid = d*self.col_count(m);
    xset = 0;
    if(m%2==0) {
      // even row case
      //console.log(self.col_count(m));
      xset = n*d+grid_offset.x%cwid;
      if (xset > cwid) {
        //console.log('hi');
        xset-=cwid;
      }
    } else {
      //console.log(self.col_count(m));
      xset = n*d+grid_offset.x%cwid;
      if(xset > cwid) {
        xset -= cwid;
      }
      xset+=d*0.5;
    }
    pos.x = xset;
    if (pos.x < 0) {
      pos.x = cwid+pos.x;
    }
    if (pos.y < 0) {
      pos.y = rwid+pos.y;
    }
    // we actually only need to draw all these for edge cases
    return [{x:pos.x-cwid,y:pos.y-rwid},{x:pos.x-cwid,y:pos.y}, {x:pos.x,y:pos.y-rwid},{x:pos.x,y:pos.y},{x:pos.x+cwid,y:pos.y}, {x:pos.x,y:pos.y+rwid},{x:pos.x+cwid,y:pos.y+rwid}];
  }
  mainloop = function () {
    var cell, cells, i;
    self.counter +=1;
    //if(self.counter%4==1) {
    //  requestAnimationFrame(mainloop); // skip out every other frame
    //  return;
    //}
    clear();
    //testing offset
    grid_offset.x+=1;
    grid_offset.y+=1;
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
    self.mat = new CA6.ToroidalMatrix(self);//self.row_count(),self.col_count());
    // set up the resize listener
    last_dimensions = {height:self.params.canvas.height,width:self.params.canvas.width};
    (function () { setInterval(resize_listener,500,self.params.canvas,last_dimensions); })();  // poll for resize
  };
  // add the mouse listener
  this.add_mouse_listener = function () {
    use_mouse = true;
    self.params.canvas.addEventListener('mousemove',function(e) { update_mouse_position(e)});
  }
  // run the animation functions
  this.run_animation = function () {
    mainloop();
  }
  this.row_count = function () {
    // row count is defined by the values of the canvas and hexagon size
    var row_count, xcross, extra,r,d;
    xcross = self.params.canvas.height/((self.params.hexagon_size/2)*1.5);
    xcross = xcross - Math.floor(xcross);
    r = self.params.hexagon_size/2; // radius of circle
    d = r*Math.sqrt(3);
    extra = 0;
    //console.log(xcross+'^'+Math.sqrt(3)/2);
    //if (xcross > 0.5) extra = 2;
    //row_count = params.canvas.height/((params.hexagon_size/2)*1.5);
    row_count = (self.params.canvas.height+d/2)/((self.params.hexagon_size/2)*1.5);
    if(Math.floor(row_count)%2==1) row_count +=1;
    return Math.floor(row_count)+extra;
  }
  this.col_count = function (m) {
    var xcross, extra;
    // column count while defined by canvas and hexagon size
    // differs depending on which row you are on
    xcross = self.params.canvas.width/((self.params.hexagon_size/2)*Math.sqrt(3));
    xcross = xcross - Math.floor(xcross);
    extra = 1;
    //if (m%2===0 && xcross > 0.5) {
    //  extra = 1;
    //} else if (m%2===0 && xcross <= 0.5) {
    //  extra = 1;
    //}
    return Math.floor(self.params.canvas.width/((self.params.hexagon_size/2)*Math.sqrt(3)))+extra;
  }
  this.fill_hexagon = function(m,n,color) {
    var rc6, rs6, ctx, x, y, r, c,r1,d1,offset,v,n_init, i, cs;
    r1 = self.params.hexagon_size/2; // radius of circle
    d1 = r1*Math.sqrt(3);
    color = color || '#FF0000';
    c = row_col_to_coord(m,n); // get the canvas coordinate
    // experimenting with offset
    //offset = grid_offset.x;
    offset = grid_offset.x%(self.col_count(m)*d1);
    if (c.x+offset > (self.col_count(m))*d1) {
      offset=offset-(self.col_count(m)*d1);
    }
    c.x += offset;
    //v = coord_to_row_col(c.x,c.y);
    //console.log(c.x)
    //console.log(v)
    c.y += grid_offset.y;
    cs = this.row_col_to_canvas_coord2(m,n);
    // these c's
    for (i = 0; i < cs.length; i+=1) {
      c = cs[i];
      ctx = self.params.context;
      ctx.save();
      //ctx.translate(0,-r1*3);
      r = (self.params.hexagon_size/2)-self.params.inner_padding; // radius of circle
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
  }

};

CA6.ToroidalMatrix = function (hex_grid) {//(m,n) {
  //console.log(hex_grid)
  var i, marr, narr, empty, self2, n;
  this.val = [];
  this.m = function () {
    return hex_grid.row_count();
  }
  //The rows must even be whether or not it puts us a bit off canvas on the wrap
  //if(m%2==1) m+=1;
  //else m+=2;
  self2 = this;
  for (i = 0; i < this.m(); i+=1) {
    narr = [];
    n = hex_grid.col_count(i);
    for (j = 0; j < n; j+=1) {
      narr.push(new CA6.Cell(i,narr.length,hex_grid));
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
    var row, col;
    row = m%(hex_grid.row_count());
    if (m < 0) row = hex_grid.row_count()+row;
    row = row%(hex_grid.row_count());
    if(self2.val[row]===undefined) {
      //console.log('trouble')
      hex_grid.do_resize(); // if we are in here something is off... try resize right away
    }
    col = n%(hex_grid.col_count(row))
    if (n <  0) col = hex_grid.col_count(row)+ col;
    col = col%(hex_grid.col_count(row))
    if(self2.val[row]===undefined) {
      console.log('empty,'+row+','+col+','+hex_grid.row_count()+','+hex_grid.col_count(row));
    }
    //console.log(col);
    //console.log(col);
    if(self2.val[row][col]===undefined) {
      //console.log('trouble2')
      hex_grid.do_resize(); // something is off try resize right away
    }
    return self2.val[row][col];
  }
  this.fill_hexagon = function (m,n,color) {
    var values, ms, ns, i, j, xcross, mact;
    values = [];
    ms = [];
    ns = [];
    //console.log(n+'--'+self2.val[m].length);
    mact = m;
    //if (m===0 || m >= self2.m()) {
    //  ms.push(0);
    //  ms.push(self2.m());
    //  mact = 0;
    //} else ms.push(m);
    ms.push(m);
    //xcross = params.canvas.width/((params.hexagon_size/2)*Math.sqrt(3));
    //xcross = xcross - Math.floor(xcross);
    if(mact >= self2.val.length) mact = self2.val.length-1;
    //if (n===0 || n >= self2.val[mact].length) {
    //  ns.push(0);
    //  ns.push(self2.val[mact].length);
    //} else ns.push(n);
    ns.push(n);
    for(i = 0; i < ms.length; i+=1) {
      for(j = 0; j < ns.length; j+=1) {
        hex_grid.fill_hexagon(ms[i],ns[j],color);
      }
    }
  }
}
CA6.Cell = function (m,n,hex_grid) {
    var color, self2, params;
    params = hex_grid.params;
    color = params.default_color;
    this.live = false;
    this.alpha = 0;
    self2 = this;
    this.set_color = function (in_color) {
      self2.color = in_color
    }
    this.draw = function () {
      params.context.save();
      params.context.globalAlpha = self2.alpha;
      hex_grid.mat.fill_hexagon(m,n,color);
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
