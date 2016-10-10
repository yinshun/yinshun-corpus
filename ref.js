var patterns={
	"taixu":/vol:(\d+);page:p?(\d+)/,
	"taisho":/vol:(\d+);page:p(\d+)([abcd])/,
	"Taisho":/no:(\d+)\.(\d+)/,
	"Taishon":/no:(\d+)/
}

var parse=function(type,target,kpos){
	kpos=kpos||this.kPos();
	var pat=patterns[type];
	if (!pat) {
		console.log("unknown ref type",type,"target",target);
		return;
	}
	var m=target.match(pat);
	
	if (!m){
		if (type=="taisho") pat=patterns["Taisho"];
		m=target.match(pat);

		if (!m) {
			pat=patterns["Taishon"]
			m=target.match(pat);
		}
	}

	if (!m) {
		debugger
		console.log("wrong target pattern",target,"type",type);
	}


	var link;
	if (type=="Taisho") {
		link="n"+m[1]+"."+m[2];
	} else {
		if (!m) {
			debugger;
		}
		link=m[1]+"p"+m[2]+(m[3]||"");
	}

	this.putField("link",type+"@"+link,kpos);
}
module.exports={parse};