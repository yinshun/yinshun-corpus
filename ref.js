var patterns={
	"taixu":/vol:(\d+);page:p?([\d\-]+)/,
	"taisho":/vol:(\d+);page:p(\d+)([abcd])/,
	"wxzj":/vol:(\d+);page:p(\d+)([abcd])/,
	"yinshun":/vol:(\d)+;page:p?([ab\d\-]+)/,
	"Taisho":/no:(.+)/ //for n1,26,99,100,125 with sub sid
}

var parse=function(type,target,kpos){
	kpos=kpos||this.kPos();
	var pat=patterns[type];
	var subsid=false;
	if (!pat){
		console.log("unknown ref type",type,"target",target);
		return;
	}
	if (!target) {
		debugger;
	}
	var m=target.match(pat);

	if (!m) {
		debugger
		console.log("wrong target pattern",target,"type",type);
	} else {
		const link=(type=="Taisho")?m[1]:m[1]+"p"+m[2]+(m[3]||"");
		this.putArticleField("link",type+"@"+link,kpos);
	}
}
module.exports={parse};