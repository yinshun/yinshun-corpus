const sourcepath="xml/";
const targetpath="genxml/";
const fs=require("fs");
const Sax=require("sax");
const maxfile=0;
var oldtexts={};
var output="";
var lbnow="",filename="";
var files=require("./filelist")(maxfile);

const stringifyTag=function(tag){
	var s="<"+tag.name,attr="",multilinelb=false;
	if (tag.name=="lb" && output[output.length-1]!=="\n"){
		multilinelb=true;
	}
	if (multilinelb) s+="\n";

	for (var i in tag.attributes) {
		attr+=i+'="'+tag.attributes[i]+'"';
	}	
	if (attr&&!multilinelb) s+=" ";
	if (attr) s+=attr;
	s+=tag.isSelfClosing?"/>":">";
	return s;
}
const stringifyPI=function(tag){
	return "<?"+tag.name+" "+tag.body+"?>";
}
const addContent=function(content,name){
	const Sax=require("sax");
	const parser = Sax.parser(true);
	var choosing=0;
	var otext="",ntext="";
	var tagstack=[];
	output="";
	parser.ontext=function(t){
		if (choosing) {
			if (choosing==2) {
				otext+=t;
			} else if (choosing==3) {
				ntext+=t;
			}
		} else {
			output+=t;
		}
	}
	parser.onopentag=function(tag){
		const tn=tag.name;
		if (tn=="choice") {
			choosing=true;
		} else if (tn=="lb") {
			lbnow=tag.attributes.n;
		}
		tagstack.push(tag);
		const s=stringifyTag(tag);
		if (choosing) {
			if (tn=="sic"||tn=="orig") {
				choosing=2;
			} else if (tn=="reg" ||tn=="corr") {
				choosing=3;
			} else {
				if (choosing==2) otext+=s;
				else if (choosing==3) ntext+=s;
			}
		} else{
			output+=s;
		}
	}

	const lastlinelength=function(){
		const at=output.lastIndexOf("\n")+1;
		return output.length-at;
	}
	const saveoldtext=function(){
		if (!oldtexts[filename]) oldtexts[filename]=[];
		offset=lastlinelength();
		oldtexts[filename].push([lbnow,offset,otext]);
	}
	parser.onclosetag=function(tagname){
		const tag=tagstack.pop();
		if (!tag.isSelfClosing && choosing==0) {
			output+="</"+tagname+">";
		}

		if (tagname=="choice") {
			choosing=false;
			saveoldtext();
			output+=ntext;			
			otext="",ntext="";
		}
	}	
	parser.onprocessinginstruction =function(p){
		output+=stringifyPI(p);
	}
	parser.write(content);
	return output;
}
const addFile=function(fn){
	const content=fs.readFileSync(sourcepath+fn,"utf8").replace(/\r?\n/);
	filename=fn;
	console.log(fn);
	var output=addContent.call(this,content,fn);
	output=output.replace("?>undefined<","?>\n<");//don't know why
	fs.writeFileSync(targetpath+fn,output,"utf8");
}
files.forEach(fn=>addFile(fn));

fs.writeFileSync("choice.json",JSON.stringify(oldtexts,""," "),"utf8")
