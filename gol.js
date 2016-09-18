// Conway's Game of Life
// Color switching is done by minimum neighbors with the color and a success rate
// You can use as many colors as you want
// After max_inert, the color of a square reverts to color_index 0
// You can make one more prolific and one more infectious and watch them battle
GOL = {counter:0}

GOL.params = {
  square_width:12,
  vnum:0,
  hnum:0,
  frames:10,
  fade_out:0.01,
  fade_in:0.1,
  max_inert:800, // done on draw so scale with frames to keep similar
  grid_color:'rgba(0,0,0,0.8)',
  colors:[] // an array that details colors and rules for mixing
};

GOL.init_colors = function () {
  var c;
  c = new GOL.color('rgba(30,30,40,0.4)',0.001,2,1);
  GOL.params.colors.push(c);
  c = new GOL.color('rgba(30,30,40,0.4)',0.0000001,1,0.7);
  GOL.params.colors.push(c);
  c = new GOL.color('rgba(90,90,100,0.25)',0.00003,1,0.6);
  GOL.params.colors.push(c);
  //c = new GOL.color('rgba(204,163,0,0.2)',0.00001,1,0.85);
  //GOL.params.colors.push(c);
}

// function that gets called from the body
GOL.init = function () {
  GOL.canvas = document.getElementById("background");
  GOL.context = GOL.canvas.getContext("2d");
  GOL.canvas.addEventListener('mousemove',function(e) { GOL.update_mouse_position(e)});
  GOL.grid_values = new GOL.TorodialMatrix(GOL.params.vnum,GOL.params.hnum);
  GOL.stretch_canvas();
  //console.log(GOL.params.vnum+','+GOL.params.hnum)
  GOL.init_colors();
  GOL.init_grid();
  GOL.main_loop();
}

GOL.color = function (color,noise_rate,infection,irate) {
  this.color = color;
  this.noise = noise_rate;
  this.infection_requirement = infection;
  this.infection_rate = irate;
}

GOL.main_loop = function () {
  GOL.counter += 1;
  // calculate every tick
  GOL.calculate_next(GOL.counter%GOL.params.frames);
  if(GOL.counter%GOL.params.frames===0) GOL.compile_grid();
  // render the grid on every tick
  GOL.clear();
  GOL.draw_grid();
  GOL.draw_cells();
  
  requestAnimationFrame(GOL.main_loop)
}

GOL.clear = function () {
  GOL.context.save();
  GOL.context.clearRect(0,0,GOL.canvas.width,GOL.canvas.height);
  GOL.context.restore();
}

GOL.compile_grid = function () {
  var s, i, j, ms, ns, k, l, h;
  s = GOL.grid_values;
  for (i = 0; i < s.m(); i++) { //vertical
    for (j = 0; j < s.n(); j++) { //horizontal
      //if (s[i][j].next === 0) s[i][j].color_index = 0;
      // inject something interesting ranomly for each color
      for (h = 0; h < GOL.params.colors.length; h+=1) {
        if(Math.random() < GOL.params.colors[h].noise) {
          ms = [s.row_offset(i,-1),i,s.row_offset(i,1)];
          ns = [s.col_offset(j,-1),j,s.col_offset(j,1)];
          for (k = 0; k < ms.length; k += 1) {
            for (l = 0; l < ns.length; l += 1) {
              if(Math.random() < 0.5) {
                s[ms[k]][ns[l]].current = 1;
                s[ms[k]][ns[l]].color_index = h;
                s[ms[k]][ns[l]].step = 0;
              }
            }
          }
        }
      }
      s[i][j].current = s[i][j].next; // save current new state
      s[i][j].delay = 0;
      //s[i][j].rand = Math.random(); // save when to print it
      //s[i][j].display_current = s[i][j].current;
      //s[i][j].display_prev = s[i][j].prev;
      //s[i][j].prev_step = s[i][j].step
    }
  }
  return;
}

GOL.calculate_next = function (subset) {
  if(subset===0) return;
  var i,j, s, curr, live_neighbor_count, temp, neighbor_color_counts, mincol, k, bestcol,bestk;
  s = GOL.grid_values;
  // work on new grid values
  for(i = 0; i < s.m(); i++) {
    // possible rows are from 0 to s.m-1 and 
    // subsets are 1 to frames - 1
    if(i%(GOL.params.frames-1) !== (subset-1)) continue;
    for (j = 0; j < s.n(); j++) { //horizontal
      s[i][j].next = s[i][j].current; // buffer our current state

      live_neighbor_count = s.live_neighbor_count(i,j);
      neighbor_color_counts = s.neighbor_color_count(i,j);
      mincol = 0;
      bestcol = 0;
      bestk = -1;
      for (k = 0; k < GOL.params.colors.length; k+=1) {
        mincol = neighbor_color_counts[k] - GOL.params.colors[k].infection_requirement
        if (mincol > bestcol) {
          bestcol = mincol;
          bestk = k;
          //console.log(bestk)
        }
      }
      if(bestcol > 0) {
        if (Math.random() < GOL.params.colors[bestk].infection_rate) {
          if(s[i][j].color_index !== bestk) s[i][j].step = 0; // fade in on color change
          s[i][j].color_index = bestk;
        }
      }
      // rule 1
      if (s[i][j].current===1 && live_neighbor_count < 2) {
        //console.log('kill1');
        s[i][j].next = 0;
        continue;
      }

      // rule 2
      if (s[i][j].current===1 && (live_neighbor_count === 2 || live_neighbor_count === 3)) {
        //console.log('keep1');
        continue;
      }

      // rule 3
      if (s[i][j].current===1 && live_neighbor_count >= 3) {
        s[i][j].next = 0;
        continue;
      }
      
      // rule 4
      if (s[i][j].current===0 && live_neighbor_count === 3) {
        s[i][j].next = 1;
      }
    }
  }
}

GOL.cell = function () {
  this.current=0;
  this.next=0;
  this.rand=0;
  this.step=0;
  this.delay=0;
  this.color_index=0;
  this.intert = 0;
}

//rows and columns
GOL.TorodialMatrix = function (m,n) {
  var i, marr, narr, empty;
  this.val = [];
  this.m = m;
  this.n = n;
  this.prototype = this.val.prototype;
  var self = this;
  for (i = 0; i < this.m; i+=1) {
    narr = [];
    // initialize two values, the current and a buffer
    for (j = 0; j < this.n; j+=1) {
      narr.push(new GOL.cell);
    }
    this.val.push(narr);
  }
  this.val.neighbor_color_count = function (i,j) {
    var topv, bottomv, lefth, righth, v, h, cnts, k, l, i;
    topv = self.val.row_offset(i,-1);
    bottomv = self.val.row_offset(i,1);
    lefth = self.val.col_offset(j,-1);
    righth = self.val.col_offset(j,1);
    v = [topv, i, bottomv];
    h = [lefth, j, righth];
    cnts = [];
    for (i = 0; i < GOL.params.colors.length; i +=1) cnts.push(0);
    for (k = 0; k < v.length; k+=1) {
      for (l = 0; l < h.length; l+=1) {
        if(k===1 && l===1) { continue; }
        if(GOL.grid_values[v[k]][h[l]].current === 1) cnts[GOL.grid_values[v[k]][h[l]].color_index] +=1; // count the color
      }
    }
    return cnts;
  }
  // i is vertical, j is horizontal like matrix
  this.val.live_neighbor_count = function (i,j) {
    var topv, bottomv, lefth, righth, v, h, cnt, k, l;
    topv = self.val.row_offset(i,-1);
    bottomv = self.val.row_offset(i,1);
    lefth = self.val.col_offset(j,-1);
    righth = self.val.col_offset(j,1);
    v = [topv, i, bottomv];
    h = [lefth, j, righth];
    cnt = 0;
    for (k = 0; k < v.length; k+=1) {
      for (l = 0; l < h.length; l+=1) {
        if(k===1 && l===1) { continue; }
        if(GOL.grid_values[v[k]][h[l]].current === 1) cnt +=1;
      }
    }
    return cnt;
    //console.log(leftv+','+i+','+rightv);
  }
  this.val.log = function () {
    console.log(self.m+','+self.n);
  }
  this.val.row_offset = function(i,offset) {
    var rem;
    rem = (self.m+offset+i)%self.m;
    return rem;
  }
  this.val.col_offset = function(j,offset) {
    var rem;
    rem = (self.n+offset+j)%self.n;
    return rem;
  }
  this.val.m = function() { return self.m; }
  this.val.n = function() { return self.n; }
  this.val.resize = function(new_m, new_n) {
    //console.log(self.m+','+self.n+ ' to '+new_m+','+new_n);
    var extra, i, j;
    if(new_m > self.val.length) {
      extra = new_m -self.val.length;
      for (i = 0; i < extra; i+=1) {
        self.val.push([]);
      }
    } else if (self.val.length > new_m) {
      extra = self.val.length - new_m;
      for (i = 0; i < extra; i+=1) {
        self.val.pop();
      }
    }
    self.m = new_m;
    for(i = 0; i < self.m; i+=1) {
      if(self.val[i].length < new_n) { // add onto
        extra = new_n - self.val[i].length;
        for (j = 0; j < extra; j+=1) {
          self.val[i].push(new GOL.cell);
        }
      } else if (self.val[i].length > new_n) { // take away
        extra = self.val[i].length - new_n;
        for (j = 0; j < extra; j += 1) {
          self.val[i].pop();
        }
      }
    }
    self.n = new_n;
    return;
  }
  return this.val;
}

GOL.mouse_position = {
  x:0,
  y:0
}
GOL.update_mouse_position = function (e) {
  var x,y, hstep, vstep;
  GOL.mouse_position.x = e.clientX;
  GOL.mouse_position.y = e.clientY;
  hstep = GOL.canvas_width/GOL.params.hnum;
  vstep = GOL.canvas_height/GOL.params.vnum;
  y = Math.floor(GOL.mouse_position.y/vstep);
  x = Math.floor(GOL.mouse_position.x/hstep);
  if(GOL.grid_values[y][x]) {
    GOL.grid_values[y][x].moused +=1;
    GOL.grid_values[y][x].current = 1;
    GOL.grid_values[y][x].color_index = 0;
    GOL.grid_values[y][x].next = 1;
    GOL.grid_values[y][x].delay = Infinity;
    //console.log(GOL.grid_values[y][x].moused);
  }
}

GOL.init_grid = function () {
  var inner;
  for (i = 0; i < GOL.params.vnum; i+= 1) {
    for (j = 0; j < GOL.params.hnum; j+= 1) {
      if(Math.random() > 0.5) continue;
      GOL.grid_values[i][j].current = 1;
    }
  }
}

GOL.draw_cells = function () {
  var hstep, vstep, val, vcol;
  //console.log('fill')
  hstep = GOL.canvas_width/GOL.params.hnum;
  vstep = GOL.canvas_height/GOL.params.vnum;
  for (i = 0; i < GOL.params.vnum; i+= 1) {
    for (j = 0; j < GOL.params.hnum; j+= 1) {
      if (GOL.grid_values[i][j].current===0) {
        GOL.grid_values[i][j].inert += 1;
        if (GOL.grid_values[i][j].inert > GOL.params.max_inert) GOL.grid_values[i][j].color_index = 0;
      } else {
        GOL.grid_values[i][j].inert = 0;
      }
      GOL.context.save();
      //console.log(GOL.grid_values[i][j].color_index);
      if(GOL.grid_values[i][j].delay===0) GOL.grid_values[i][j].delay+=Math.random()*GOL.params.frames;
      GOL.grid_values[i][j].delay += 1;
      val = GOL.grid_values[i][j].current;
      if(GOL.grid_values[i][j].delay > GOL.params.frames) {
        if(val===1) { 
          GOL.grid_values[i][j].step+=GOL.params.fade_in;
          GOL.grid_values[i][j].step = Math.min(1,GOL.grid_values[i][j].step);
        } else { 
          GOL.grid_values[i][j].step -= GOL.params.fade_out;
          GOL.grid_values[i][j].step = Math.max(0,GOL.grid_values[i][j].step); 
        }
      }
      //} else if(GOL.grid_values[i][j].current !==1) {
      //  GOL.grid_values[i][j].step-= GOL.params.fade_out;
      //}
      if(GOL.grid_values[i][j].step > 0.01) {
        GOL.context.globalAlpha = GOL.grid_values[i][j].step;
        GOL.context.fillStyle=GOL.params.colors[GOL.grid_values[i][j].color_index].color;
        //console.log(GOL.params.colors[GOL.grid_values[i][j].color_index].color);
        GOL.context.beginPath();
        GOL.context.rect(j*hstep,i*vstep,GOL.params.square_width,GOL.params.square_width);
        GOL.context.fill();
      }
      GOL.context.restore();
    }
  }
}

GOL.draw_grid = function () {
  var num, vstep,hstep;
  vstep = GOL.canvas_height/GOL.params.vnum;
  GOL.context.save();
  GOL.context.strokeStyle=GOL.params.grid_color;
  GOL.context.lineWidth=0.1;
  for (i = 0; i < GOL.params.vnum; i+= 1) {
    GOL.context.beginPath()
    GOL.context.moveTo(0,i*vstep)
    GOL.context.lineTo(GOL.canvas_width,i*vstep)
    GOL.context.closePath();
    GOL.context.stroke();
  }
  hstep = GOL.canvas_width/GOL.params.hnum;
  for (i = 0; i < GOL.params.hnum; i+= 1) {
    GOL.context.beginPath()
    GOL.context.moveTo(i*hstep,0)
    GOL.context.lineTo(i*hstep,GOL.canvas_width)
    GOL.context.closePath();
    GOL.context.stroke();
  }
  GOL.context.restore();
}

GOL.stretch_canvas = function() {
  var num;
  GOL.canvas_width = window.innerWidth;
  GOL.canvas_height = window.innerHeight;
  document.getElementById("background").style.width=GOL.canvas_width+"px";
  document.getElementById("background").style.height=GOL.canvas_height+"px";
  //console.log('resized to '+GOL.canvas_width+','+GOL.canvas_height)
  GOL.canvas = document.getElementById("background")
  GOL.canvas.width = GOL.canvas_width;
  GOL.canvas.height = GOL.canvas_height;
  GOL.context = GOL.canvas.getContext("2d");

  
  num = GOL.canvas_height/GOL.params.square_width;
  GOL.params.vnum = Math.floor(num)
  num = GOL.canvas_width/GOL.params.square_width;
  GOL.params.hnum = Math.floor(num)

  GOL.grid_values.resize(GOL.params.vnum,GOL.params.hnum);

  // now we can redraw the grid
  GOL.draw_grid();
}
