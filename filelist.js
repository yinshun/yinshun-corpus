const buildfilelist=function(maxfile){
	var files=[];
	maxfile=maxfile||42;
	for(var i=0;i<=maxfile;i++)	{
		var n="0"+i;
		n=n.substr(n.length-2);
		files.push("y"+ n+".xml");
	}
	files.push("appendix.xml");
	return files;
};

module.exports=buildfilelist;