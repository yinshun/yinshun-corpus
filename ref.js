var patterns={
	//"taixu":/vol:(\d+);page:p?([\d\-]+)/,
	"taixu":/comp:(\d+);page:p?([\d\-]+)/,  //太虛大師的頁元為 「編」。
	"taisho":/vol:(\d+);page:p(\d+)([abcd])/,
	"taisho_v":/vol:(\d+)/,
	"wxzj":/vol:(\d+);page:p(\d+)([abcd])/,
	"yinshun":/vol:(\d+);page:p?([ab\d]+)/,
	"Taisho":/no:(.+)/ //for n1,26,99,100,125 with sub sid
}
const yinshunVolOffset={ //只能引正文頁碼 1p1是妙雲序目 2p1才是金剛經講記的正文
	1:1,8:1,9:1,10:2,12:2,13:2,25:1,30:2,//acc 12
	33:2, 34:2,35:1,36:1,
	37:2,38:1,39:1,40:1,42:1,43:1
}
const adjustvol=function(v){
	var vv=parseInt(v,10);
	var accuOffset=0;
	for (var i=1;i<vv+1;i++) {
		accuOffset+= yinshunVolOffset[i]||0;
	}
	return vv+accuOffset;
}
var parse=function(type,target,krange){
	var pat=patterns[type];
	var subsid=false;
	if (!pat){
		console.log("unknown ref type",type,"target",target);
		return;
	}
	if (!target) {
		debugger;
	}
	try {
		var m=target.match(pat);	
	} catch(e) {
		debugger;
		console.log(e);
	}
	

	if (!m) {
		if (type=="taisho") {//try 
			m=target.match(patterns.taisho_v);
		}
		if (m) {
			const link=m[1]+"p1a01";
			this.putArticleField("link",type+"@"+link,krange);
		} else {
			console.log("wrong target pattern",target,"type",type);
		}
	} else {
		var link=(type=="Taisho")?m[1]:m[1]+"p"+m[2]+(m[3]||"");

		if (type=="yinshun") {
			var vol=adjustvol(m[1]);
			var pg=m[2];
			if (pg[0]=="a") { //序言
				vol--;
				pg=pg.substr(1);
			} else if (pg[0]=="b"){ //有些書有再序言
				vol-=2;
				pg=pg.substr(1);
			}
			link=vol+"p"+pg;
		}
		this.putArticleField("link",type+"@"+link,krange);
	}
}
module.exports={parse};