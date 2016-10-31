var patterns={
	"taixu":/vol:(\d+);page:p?([\d\-]+)/,
	"taisho":/vol:(\d+);page:p(\d+)([abcd])/,
	"wxzj":/vol:(\d+);page:p(\d+)([abcd])/,
	"yinshun":/vol:(\d)+;page:p?([ab\d\-]+)/,
	"Taisho":/no:(\d+)\.(\d+)/,
	"Taishon":/no:(\d+)/,
	"Taishoea":/no:(\d+)\.(\d+)\.(\d+)/ //EA only 4 occurences in y31
}

var parse=function(type,target,kpos){
	kpos=kpos||this.kPos();
	var pat=patterns[type];
	var taishon=false;
	if (!pat) {
		console.log("unknown ref type",type,"target",target);
		return;
	}
	if (!target) {
		debugger;
	}
	var m=target.match(pat);
	
	if (!m){
		pat=patterns["Taisho"];
		taishon=true;
		m=target.match(pat);

		if (!m) {
			pat=patterns["Taishon"];
			m=target.match(pat);
			
			if (!m) {
				pat=patterns["Taishoea"];
				m=target.match(pat);
			}
		}
	}

	if (!m) {
		debugger
		console.log("wrong target pattern",target,"type",type);
	}


	var link;
	if (taishon) {
		link="n"+m[1]+"."+m[2];
	} else {
		if (!m) {
			debugger;
		}
		link=m[1]+"p"+m[2]+(m[3]||"");
	}

	this.putBookField("link",type+"@"+link,kpos);
}
module.exports={parse};