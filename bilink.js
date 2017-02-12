const fs=require("fs");

const putbilink=function(corpus) { //put bilink to taisho, return a list of article has bilink
	const fn='link-taisho-yinshun.json';
	if (!fs.existsSync(fn))exit;
	const bilinks=JSON.parse(fs.readFileSync(fn,"utf8"));
	fieldname=bilinks.shift().type;
	var articles={};
	for (var i=0;i<bilinks.length;i++) {
		const bilink=bilinks[i].split("\t");
		var krange=corpus.parseRange(bilink[0]).kRange;
		var article=corpus.findArticle(krange);
		if (article<0) {
			console.log("invalid address",bilink[0],'filename',fn);
			continue;
		}
		articles[article]=true;
		const value=parseInt(bilink[1],10);
		corpus.putArticleField("bilink",value,krange,article);
	}
	return Object.keys(articles).map(i=>parseInt(i,10)).sort();
}
module.exports={putbilink};