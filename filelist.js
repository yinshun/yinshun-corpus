const buildfilelist=function(maxfile){
	var files=[];
	//y00 missing lb tag before pb=54
	maxfile=maxfile||44;
	for(var i=1;i<=maxfile;i++)	{
		var n="0"+i;
		n=n.substr(n.length-2);
		files.push("y"+ n+".xml");
	}
	//files.push("appendix.xml");
	return files;
};

module.exports=buildfilelist;