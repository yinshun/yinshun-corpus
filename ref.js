var patterns={
	"taixu":/vol:(\d+);page:p(\d+)/,
	"taisho":/vol:(\d+);page:p(\d+)([abcd])/
}
var parse=function(type,target,kpos){
	kpos=kpos||this.kPos();
	var pat=patterns[type];
	if (!pat) {
		console.log("unknown ref type",type);
		return;
	}
	var m=target.match(pat);
	if (!m){
		console.log("wrong target pattern",target,"type",type);
	}
}
module.exports={parse};