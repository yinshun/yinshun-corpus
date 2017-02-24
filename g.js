(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var prevpage=0;
const pb=function(tag,closing){
	const n=tag.attributes.id;
	if (!n || n.indexOf("p")==-1){
		return;
	}
	var pbn=n.split(/[\.p]/);
	var page=parseInt(pbn.length==2?pbn[1]:pbn[0],10);

	if (page===1) {
		this.addBook();
	} else if (page!==prevpage+1) {//newpage
		throw "wrong page number "+page+", prev:"+prevpage;		
	}
	this._pb=page;
	this._pbline=0;
	const kpos=this.makeKPos(this.bookCount-1,page-1,0,0);
	this.setPos(kpos,this.tPos);
	prevpage=page;
}
var maxarticlelen=0, prevtpos=0;
const article=function(tag,closing){
	if (closing) {
		const caption=this.popText();
		this.addText(caption);
		this.putField("article",caption,this.articlePos);
	} else {
		const tree=tag.attributes.t;
		this.articlePos=this.kPos;
		if (this.tPos-prevtpos>maxarticlelen) maxarticlelen=this.tPos-prevtpos;
		prevtpos=this.tPos;
		return true;
	}
}
const p=function(tag,closing){
	if (closing) return;
	this.putEmptyBookField("p");
}
module.exports={p,pb,article,maxArticle:()=>maxarticlelen};
},{}],2:[function(require,module,exports){
var noteid={};
const ptr=function(tag,closing){
	if (closing)return;
	const n=tag.attributes.n;
	if (noteid[n]) {
		throw "note ptr exists"+n;
	}
	noteid[tag.attributes.n]=this.kPos;
}
var defstart;
const def=function(tag,closing){
	if (closing) {
		const s=this.popText();
		const n=tag.attributes.n;
		if (!n) {
			console.warn("釋 without n",this.stringify(this.kPos));
			return;
		}
		const defrange=this.makeKRange(defstart,this.kPos);
		ptrpos=noteid[n];
		if (!ptrpos) {
			throw "no such ptr "+n;
		}
		this.addText(s);
		this.putField("note",defrange, ptrpos);
	} else {
		defstart=this.kPos;
		return true;
	}
	
}
module.exports={ptr,def};
},{}],3:[function(require,module,exports){
var treetag=[];
var knowntag={"檔":true};
var ignoretags={頁:true,段:true,註:true,
	釋:true,RM:true,RN:true,P:true,PB:true,圖:true,IMAGE:true,IMG:true,
	圖文字:true,
};
const prolog=function(tag,parser){
	if (ignoretags[tag.name])return treetag;
	var t=tag.attributes.t,l=tag.attributes.l;
	var stoping=false;
	var tags=[];
	if (t) { //tree tag
		//console.log("tree",t);
		if (t[t.length-1]==".") {
			t=t.substr(0,t.length-1);
			stoping=true;
		}
		tags=t.split(",");
		const at=treetag.indexOf(tag.name);
		if (at>-1) {
			treetag.length=at+1;
		} else treetag=[tag.name];
		if (tags.length) treetag=treetag.concat(tags);
	}
	if (l) { //leaf tag
		//console.log("leaf",l);
		tags=tags.concat(l.split(","));
	}

	if (tags){
		for (var i=0;i<tags.length;i++) knowntag[tags[i]]=true;		
	}

	const depth=treetag.indexOf(tag.name);
	if (depth==-1 &&!knowntag[tag.name]) {
		console.warn("unknown tag",tag.name,"at line",parser.line);
	}
	return treetag;
}


module.exports=prolog;
},{}],4:[function(require,module,exports){
/*create bigram*/
const openCorpus=require("ksana-corpus").openCorpus;
var bigramcount=0;
var bigram={};
var unigram=[];

var addbigram=function(bi) {
	if (!bigram[bi]) {
		bigram[bi]=0;
		bigramcount++;
	}
	bigram[bi]++;
}
var dopage=function(data) {
	var str=data.join(); //cbeta has lf
	var i=0;
	while (i<str.length) {
		var c1=str.charCodeAt(i);
		var c2=str.charCodeAt(i+1);
		if (c1>=0x4e00 && c1<0x9fff) {
			if (!unigram[c1-0x4e00]) unigram[c1-0x4e00]=0;
			unigram[c1-0x4e00]++;
			if (c2>0x4e00 && c2<0x9fff)	addbigram(str[i]+str[i+1]);
		}
		i++;
	}
}
var dobooks=function(data) {
	var lastpercent=0;
	for (var i=0;i<data.length;i++) {
		var percent=Math.floor(i*100/data.length);
		if (percent>lastpercent){
			process.stdout.write(percent+"% \033[0G");
			lastpercent=percent;
		}
		dopage(data[i]);
	}
}

var getunigramhit=function(bi) {
	return unigram[bi.charCodeAt(0)-0x4e00]+
	unigram[bi.charCodeAt(1)-0x4e00]
}
var report=function(bigramarr) {
	var tokenlength=unigram.reduce(function(p,i){return p+i},0);
	console.log("token length", tokenlength);
	var bigramlength=bigramarr.reduce(function(p,i){return p+i[1]},0);
	console.log("bigram length", bigramlength);
	console.log("overhead",bigramlength/tokenlength);
}
var summary=function(opts){
	console.log("bigramcount",bigramcount);

	var bigramarr=[];
	for (var i in bigram) {
		var hit=getunigramhit(i);
		var r=bigram[i]/hit;
		bigramarr.push([i,bigram[i], 
		 unigram[i.charCodeAt(0)-0x4e00],
	     unigram[i.charCodeAt(1)-0x4e00],r]);
	}

	console.log("sorting")
	bigramarr.sort(function(a,b){return b[1]-a[1]});

	bigramarr=bigramarr.filter(function(b){return b[1]>opts.minoccur});

	console.log("writing")
	require("fs").writeFileSync("bigrams.txt",bigramarr.join("\n"),"utf8");	

	report(bigramarr);
	bigramarr=bigramarr.map(function(b){return b[0]});
	//bigramarr.sort(function(a,b){return a>b?1:b>a?-1:0});

	require("fs").writeFileSync("bigrams.js",'module.exports="'+bigramarr.join(" ")+'"',"utf8");	

}
var genbigram=function(corpus,opts) {
	openCorpus(corpus,function(err,cor){
		cor.get(["texts"],{recursive:true},function(data){
			console.log("loaded");
			console.time("bigram");
			dobooks(data);
			console.timeEnd("bigram")
			console.time("summary");
			summary({minoccur:opts.minoccur||1000});
			console.timeEnd("summary");
		});		
	})
}
module.exports=genbigram;

},{"fs":undefined,"ksana-corpus":25}],5:[function(require,module,exports){
var prevpage=0,prevline=0;
const lb_page_line=function(tag){
	const n=tag.attributes.n;
	if (!n || n.indexOf(".")==-1){
		//a lb without n in y01 a19.11
		//or lb n has no .  y13.xml page 132~137,not seen by engine.
		return;
	}
	var pbn=n.split(".");
	const str_page=pbn[0],	str_line=pbn[1];

	var page=parseInt(str_page,10), line=parseInt(str_line,10);
	if (isNaN(page)) page=parseInt(str_page.substr(1),10);
	if (page<1) {
		console.log("negative page number, ",tag.name,"n=",tag.attributes.n);
		throw "negative page number";
		return;
	}
	var s=this.popBaseText();
	this.putLine(s);

	if (prevpage!==str_page && page===1) {
		this.addBook();
	} else {
		if (line!=1 && line-prevline>1) {
			console.log("Gap at page ",page,"line ",line,",previous line",prevline);
		}
	}

	if (isNaN(page)) {
		throw "error page number "+str_page;
	}
	if (this.bookCount){
		const kpos=this.makeKPos(this.bookCount,page-1,line-1,0);
		if (kpos==-1) {
			throw "error lb "+tag.attributes.n;
		}
		this.newLine(kpos);
	}
	prevpage=str_page;
	prevline=line;
}
var subtreeitems=[];
var subtreekpos;
const head_subtree_finalize=function(){
	this.putField("subtoc",subtreeitems,subtreekpos);
	this.putField("subtoc_range",this.kPos,subtreekpos);
}

const encodeSubtreeItem=require("./subtree").encodeSubtreeItem;

const head_subtree=function(tag,closing,depth,removetext){
	if (closing){
		const text=this.popText();

		if (depth==1) { //new subtoc
			if (subtreeitems.length) {
				this.putField("subtoc",subtreeitems,subtreekpos);
				this.putField("subtoc_range",this.kPos,subtreekpos);
				subtreeitems=[];
			}
			subtreekpos=this.kPos;
		}
		const tocobj={depth:depth,text:text,kpos:this.kPos};
		subtreeitems.push(encodeSubtreeItem(tocobj));

		if (!removetext) this.addText(text);
	} else {
		return true;
	}
}
module.exports={lb_page_line:lb_page_line,head_subtree:head_subtree,
	head_subtree_finalize:head_subtree_finalize};

},{"./subtree":15}],6:[function(require,module,exports){
const Ksanacount=require("ksana-corpus/ksanacount");
const Ksanapos=require("ksana-corpus/ksanapos");
const Textutil=require("ksana-corpus/textutil");
const Romable=require("./romable");
const Tokenizer=require("ksana-corpus/tokenizer");
const knownPatterns=require("./knownpatterns");
const genBigram=require("./genbigram");
const builderVersion=20161121;
const createInverted=require("./inverted").createInverted;
const parsers={
	xml:require("./parsexml"),
	htll:require("./parsehtll"),
	accelon3:require("./parseaccelon3")
}

const createCorpus=function(opts){
	opts=opts||{};

	const bigrams=opts.bigrams||null;
	const addressPattern=opts.bitPat?knownPatterns[opts.bitPat]:
			Ksanapos.buildAddressPattern(opts.bits,opts.column);

			//start from vol=1, to make range always bigger than pos
	var LineKStart=Ksanapos.makeKPos([1,0,0,0],addressPattern), 
	LineKCount=0, //character count of line line 
	started=false; //text will be processed when true
	var totalTextSize= 0;
	var prevlinekpos=-1;
	var filecount=0, bookcount=0;
	var textstack=[""];
	const tokenizerVersion=opts.tokenizerVersion||1;

	var romable=Romable({invertAField:opts.invertAField});
	const inverted=opts.textOnly?null:
		createInverted({tokenizerVersion:tokenizerVersion,addressPattern:addressPattern
			,bigrams:bigrams,removePunc:opts.removePunc});

	var finalized=false;
	opts.maxTextStackDepth=opts.maxTextStackDepth||2;
	
	var onBookStart,onBookEnd,onToken, onFileStart, onFileEnd, onFinalize;

	var disorderPages=[];
	var longLines=[];

	var prevArticlePos=0;

	const addFile=function(fn){
		if (finalized) {
			throw "cannot add file "+fn+" after finalized";
		}
		if (!require("fs").existsSync(fn)) {
			if (fn.indexOf("#")==-1) console.log("file not found",fn);
			return;
		}
		onFileStart&&onFileStart.call(this,fn,filecount);
		this.parser.addFile.call(this,fn,opts);
		this.putLine(this.popBaseText());

		onFileEnd&&onFileEnd.call(this,fn,filecount);
		filecount++;
	}

	const setHandlers=function(openhandlers,closehandlers,otherhandlers){
		otherhandlers=otherhandlers||{};
		this.parser.setHandlers.call(this,openhandlers,closehandlers,otherhandlers);
		onBookStart=otherhandlers.bookStart;
		onBookEnd=otherhandlers.bookEnd;
		onFileStart=otherhandlers.fileStart;
		onFileEnd=otherhandlers.fileEnd;
		onToken=otherhandlers.onToken;
		onFinalize=otherhandlers.finalize;
	}

	const putField=function(name,value,kpos){
		kpos=kpos||this.kPos;
		if (name=="article") throw "use putArticle";
		romable.putField(name,value,kpos);
	}
	const putBookField=function(name,value,kpos){
		kpos=kpos||this.kPos;
		const p=Ksanapos.unpack(kpos,this.addressPattern);
		romable.putField(name,value,kpos,p[0]);
	}

	const putEmptyField=function(name,kpos){
		kpos=kpos||this.kPos;
		romable.putField(name,null,kpos);	
	}
	const putEmptyBookField=function(name,kpos){
		kpos=kpos||this.kPos;
		const p=Ksanapos.unpack(kpos,this.addressPattern);
		romable.putField(name,null,kpos,p[0]);	
	}

	const putArticleField=function(name,value,kpos,article){
		kpos=kpos||this.kPos;
		romable.putAField(name,value,kpos,article);
	}

	const putEmptyArticleField=function(name,kpos,article){
		kpos=kpos||this.kPos;
		romable.putAField(name,null,kpos,article);
	}

	const putArticle=function(articlename,kpos,tpos){
		kpos=kpos||this.kPos;
		const book=Textutil.bookOf.call(this,kpos,this.addressPattern);
		const prevbook=Textutil.bookOf.call(this,prevArticlePos);
		if (book>prevbook) {
			kpos=Ksanapos.bookStartPos(kpos,this.addressPattern);
		}
		romable.putArticle(articlename,kpos);
		inverted&&inverted.putArticle(tpos);
		prevArticlePos=kpos;
	}
	const putGroup=function(groupname,kpos,tpos){
		kpos=kpos||this.kPos;
		tpos=tpos||this.tPos;
		romable.putField("group",groupname,kpos);
		inverted&&inverted.putGroup(tpos);	
	}
	const addText=function(t){
		if (!t)return;

		if (textstack.length==1 && started) {
			LineKCount+=this.kcount(t);
			if (LineKCount>addressPattern.maxchar) {
				var human=Ksanapos.stringify(this.kPos,addressPattern);
				longLines.push([this.kPos,human,t]);
				lineKCount=addressPattern.maxchar;
			}
		}
		textstack[textstack.length-1]+=t;
	}

	const popBaseText=function(){
		const s=textstack.shift();
		textstack.unshift("");
		return s;
	}
	const popText=function(){
		const s=textstack.pop();
		if (textstack.length==0) textstack.push("");//make sure text stack has at least one entry
		return s;
	}
	const peekText=function(){
		return textstack[textstack.length-1]||"";
	}
	const addBook=function(){
		if (bookcount){
			//store last line
			var s=this.popBaseText();
			if (s[s.length-1]=="\n") s=s.substr(0,s.length-1);//dirty
			if (s) this.putLine(s);
			onBookEnd &&onBookEnd.call(this,bookcount);
		}

		inverted&&inverted.putBookPos.call(this,bookcount);
		bookcount++;
		onBookStart&&onBookStart.call(this,bookcount);
	}
	const makeKPos=function(book,page,line,character,pat){
		pat=pat||addressPattern;
		return Ksanapos.makeKPos([book,page,line,character],pat);
	}

	const makeKRange=function(startkpos,endkpos,pat){
		pat=pat||addressPattern;
		return Ksanapos.makeKRange(startkpos,endkpos,pat);
	}

	const nextLine=function(kpos) {//return kpos of nextline ch 0
		var u=Ksanapos.unpack(kpos,addressPattern);
		u[2]++;u[3]=0;
		return Ksanapos.makeKPos(u,addressPattern);
	}

	//for xml without lb, call setKPos to set kpos
	const setPos=function(kpos){
		LineKStart=kpos;
		LineKCount=0;
		prevlinekpos=kpos;		
	}

	//call newLine on begining of <lb>
	const newLine=function(kpos){ //reset Line to a new kpos
		if (isNaN(kpos)||kpos<1) return;
		if (prevlinekpos>kpos ) {
			var human=Ksanapos.stringify(kpos,addressPattern);
			var prevh=Ksanapos.stringify(prevlinekpos,addressPattern);
			if (opts.randomPage) {
				disorderPages.push([kpos,human,prevlinekpos,prevh]);
			} else {
				debugger;
				console.error("line",this.parser.line());
				throw "line kpos must be larger the previous one. kpos:"+
				human+"prev "+prevh;
			}
		}
		inverted&&inverted.putLinePos.call(this,kpos);
		setPos(kpos);
	}
	const nextLineStart=function(kpos) {//return kpos of beginning of next line
		const arr=Ksanapos.unpack(kpos,this.addressPattern);
		arr[2]++;
		arr[3]=0;
		return Ksanapos.makeKPos(arr,this.addressPattern);
	}

	//call putLine on end of </lb>
	const putLine=function(s){
		if (LineKStart<1) return;//first call to putLine has no effect
		//trim tailing crlf
		while (s.length && s[s.length-1]==="\n"||s[s.length-1]==="\r") {
			s=s.substr(0,s.length-1);
		}
		while (s[0]==="\n"||s[0]==="\r") {
			s=s.substr(1);
		}
		s=s.replace(/\r?\n/g," ");//replace internal crlf with space

		romable.putLine.call(this,s,LineKStart);
		totalTextSize+=s.length;
		var token=null,i;
		inverted&&inverted.putLine(s);
	}

	const start=function(){
		started=true;
		return this.popText();
	}

	const stop=function(){
		started=false;
		bookcount&&onBookEnd&&onBookEnd.call(this);
	}

	const buildMeta=function(){
		var meta={date:(new Date()).toString()};
		meta.versions={tokenizer:tokenizerVersion,builder:builderVersion};
		meta.bits=addressPattern.bits;
		meta.name=opts.name;
		if (opts.article) meta.article=opts.article;
		if (addressPattern.column) meta.column=addressPattern.column;
		if (opts.language) meta.language=opts.language;
		if (opts.invertAField) meta.invertAField=opts.invertAField;
		if (opts.articleFields) meta.articleFields=opts.articleFields;
		if (opts.removePunc) meta.removePunc=opts.removePunc;
		if (opts.title) meta.title=opts.title;
		if (opts.groupPrefix) meta.groupPrefix=opts.groupPrefix;
		if (opts.linkTo) meta.linkTo=opts.linkTo;
		meta.endpos=LineKStart+LineKCount;
		if (inverted) meta.endtpos=inverted.tPos();
		return meta;
	}

	const writeKDB=function(fn,cb){
		started&&stop();
		onFinalize&&onFinalize.call(this);
		finalized=true;
		//var okdb="./outputkdb";
		const meta=buildMeta();
		const rom=romable.buildROM(meta,inverted);

		if (typeof window!=="undefined") console.log(rom);
		console.log(opts.extrasize)
		var size=totalTextSize*5 + (opts.extrasize||0) ;
		if (size<1000000) size=1000000;
		require("./outputkdb").write(fn,rom,size,cb);
	}
	const stringify=function(kpos) {
		return Ksanapos.stringify(kpos,addressPattern);
	}
	const parseRange=function(s){
		return Textutil.parseRange(s,addressPattern);
	}
	const handlers=require("./handlers");
	const instance={textstack:textstack,popText:popText,
		peekText:peekText,popBaseText:popBaseText,setHandlers:setHandlers, nextLine:nextLine,
		addFile:addFile, addText:addText,addBook:addBook, 
		putField:putField, putEmptyField:putEmptyField,
		putArticle:putArticle,putArticleField:putArticleField,putEmptyArticleField:putEmptyArticleField,
		putGroup:putGroup,parseRange,
		putBookField:putBookField,putEmptyBookField:putEmptyBookField,handlers:handlers,
		setPos:setPos, newLine:newLine, putLine:putLine, nextLineStart:nextLineStart, stringify:stringify,
		findArticle:romable.findArticle,
		makeKPos:makeKPos, makeKRange:makeKRange,	start:start, romable:romable, stop:stop, writeKDB:writeKDB};

	Object.defineProperty(instance,"kPos",{ get:function(){return LineKStart+LineKCount}});
	Object.defineProperty(instance,"kPosH",{ get:function(){return Ksanapos.stringify(LineKStart+LineKCount,addressPattern)}});
	Object.defineProperty(instance,"fileCount",{ get:function(){return filecount}});
	Object.defineProperty(instance,"bookCount",{ get:function(){return bookcount}});
	Object.defineProperty(instance,"addressPattern",{ get:function(){return addressPattern}});
	Object.defineProperty(instance,"started",{ get:function(){return started}});
	Object.defineProperty(instance,"disorderPages",{ get:function(){return disorderPages}});
	Object.defineProperty(instance,"longLines",{ get:function(){return longLines}});
	inverted&&Object.defineProperty(instance,"tPos",{ get:inverted.tPos});
	inverted&&Object.defineProperty(instance,"totalPosting",{ get:inverted.totalPosting});

	instance.parser=parsers[opts.inputFormat];
	if (!instance.parser) {
		throw "unsupported input format "+opts.inputFormat;
	}

	instance.kcount=Ksanacount.getCounter(opts.language);

	if(opts.autoStart) started=true;
	
	return instance;

}

const makeKPos=function(book,page,line,character,pat){
	if (typeof pat==="string") pat=knownPatterns[pat];
	return Ksanapos.makeKPos([book,page,line,character],pat);
}

module.exports={createCorpus:createCorpus,makeKPos:makeKPos,knownPatterns:knownPatterns
,genBigram:genBigram};
},{"./genbigram":4,"./handlers":5,"./inverted":7,"./knownpatterns":9,"./outputkdb":10,"./parseaccelon3":11,"./parsehtll":12,"./parsexml":13,"./romable":14,"fs":undefined,"ksana-corpus/ksanacount":26,"ksana-corpus/ksanapos":27,"ksana-corpus/textutil":29,"ksana-corpus/tokenizer":31}],7:[function(require,module,exports){
const createTokenizer=require("ksana-corpus/tokenizer").createTokenizer;

const createInverted=function(opts){
	const putBookPos=function(booknum){
		book2tpos[booknum]=tPos;
		tPos+=1000;
	}

	//linepos array is 2 dimensional, book+page*col*line
	//core structure for TPos from/to KPos
	const putLinePos=function(kpos){
		const C=Math.pow(2,addressPattern.charbits);
		const R=Math.pow(2,addressPattern.rangebits);
		idx=Math.floor((kpos%R)/C);
		book=Math.floor(kpos/R) ; //book start from 1 and might have gap, use object

		if (!line2tpos[book]) line2tpos[book]=[];
		line2tpos[book][idx]=tPos;
	}


	const posting=function(tk,tpos){
		if (!token_postings[tk]) token_postings[tk]=[];
		token_postings[tk].push(tpos);
	}

	const putToken=function(tk,type){
		if (type==TT.SPACE|| (type===TT.PUNC && removePunc)) {
			pTk=null;
			return;
		}

		if (type==TT.PUNC || type==TT.NUMBER) { //not indexed
			pTk=null;
			tPos++;
			return;
		}

		if (typeof tk==="string") {
			if (bigrams&&bigrams[pTk+tk]) {
				posting(pTk+tk,tPos-1);
				totalPosting++;
			}
			posting(tk,tPos);
			totalPosting++;
		} else {
			for (var j=0;j<tk.length;j++){ //onToken return an array
				if (bigrams[pTk+tk[j]]){
					totalPosting++;
					posting(pTk+tk[j],tPos-1);
				}
				posting(tk[j],tPos);	
				totalPosting++;
			}
		}
		tPos++;
		pTk=tk;
	}
	const putLine=function(s){
		const tokenized=tokenizer.tokenize(s);
		for (i=0;i<tokenized.length;i++) {
			const type=tokenized[i][3];
			putToken(tokenized[i][0],type);
		};
	}

	const putArticle=function(tpos){
		tpos=tpos||tPos;
		article2tpos.push(tpos);
		tPos+=500;
	}

	const putGroup=function(tpos){
		tpos=tpos||tPos;
		group2tpos.push(tpos);
	}

	const finalize=function(){
		var arr=[],posting_length=[];
		for (var i in token_postings){
			arr.push([i,token_postings[i]]);
		}
		//sort token alphabetically
		arr.sort(function(a,b){return (a[0]==b[0])?0:((a[0]>b[0])?1:-1)});
		
		for (let j=0;j<arr.length;j++) {
			posting_length.push(arr[j][1].length);
		}
		var tokens=arr.map(function(item){return item[0]});
		var postings=arr.map(function(item){return item[1]});
		token_postings={};

		return {tokens:tokens,postings:postings,article2tpos:article2tpos,
			group2tpos:group2tpos,
			line2tpos:line2tpos,book2tpos:book2tpos,posting_length:posting_length};
	}

	const tokenizer=createTokenizer(opts.tokenizerVersion);
	const TT=tokenizer.TokenTypes;
	var instance={},bigrams,removePunc;
	var token_postings={},line2tpos={},book2tpos=[],article2tpos=[];
	var group2tpos=[];
	var	pTk=null,tPos=1 ,totalPosting=0;

	instance.putLine=putLine;
	bigrams=opts.bigrams;
	addressPattern=opts.addressPattern;
	instance.tokenizer=tokenizer;
	instance.tPos=function(){return tPos};
	instance.totalPosting=function(){return totalPosting};
	instance.putBookPos=putBookPos;
	instance.putToken=putToken;
	instance.putArticle=putArticle;
	instance.putGroup=putGroup;
	instance.finalize=finalize;
	instance.putLinePos=putLinePos;

	removePunc=!!opts.removePunc;
	return instance;
}
module.exports={createInverted};
},{"ksana-corpus/tokenizer":31}],8:[function(require,module,exports){
/*
  convert any json into a binary buffer
  the buffer can be saved with a single line of fs.writeFile
*/

var DT={
	uint8:'1', //unsigned 1 byte integer
	int32:'4', // signed 4 bytes integer
	utf8:'8',  
	ucs2:'2',
	bool:'^', 
	blob:'&',
	utf8arr:'*', //shift of 8
	ucs2arr:'@', //shift of 2
	//uint8arr:'!', //shift of 1
	//int32arr:'$', //shift of 4
	vint:'`',
	pint:'~',	

	array:'\u001b',
	object:'\u001a' 
	//kdb start with an object signature,
	//type a kdb in command prompt shows nothing, avoiding annoying peep
}
var key_writing=[];//for debugging
var pack_int = function (ar, savedelta) { // pack ar into
  if (!ar || ar.length === 0) return []; // empty array
  var r = [],
  i = 0,
  j = 0,
  delta = 0,
  lastv=0,
  prev = 0;
  
  do {
	delta = ar[i] || prev; //use previous value if undefined (gap in array)
	if (savedelta) {
		delta -= prev;
	}
	if (delta < 0) {
		debugger;
		console.log(ar);
	  console.trace('negative value at',i,'prev:',prev,'now:',ar[i],'key:',key_writing)
	  throw 'negetive';
	  break;
	}
	
	//r[j++] = delta & 0x7f;
	r[j++] = delta % 0x80;
	//delta >>= 7;
	delta=Math.floor(delta/128);
	while (delta > 0) {
	  r[j++] = (delta % 0x80) | 0x80;
	  //delta >>= 7;
	  delta=Math.floor(delta/128);
	}
	prev = ar[i]||prev;
	i++;
  } while (i < ar.length);
  return r;
}
var Kfs=function(path,opts) {
	var handle=null;
	opts=opts||{};
	opts.size=opts.size||65536*2048; 
	console.log('kdb estimate size:',opts.size);
	var dbuf=new Buffer(opts.size);
	var cur=0;//dbuf cursor
	
	var writeSignature=function(value,pos) {
		dbuf.write(value,pos,value.length,'utf8');
		if (pos+value.length>cur) cur=pos+value.length;
		return value.length;
	}
	var writeOffset=function(value,pos) {
		dbuf.writeUInt8(Math.floor(value / (65536*65536)),pos);
		dbuf.writeUInt32BE( value & 0xFFFFFFFF,pos+1);
		if (pos+5>cur) cur=pos+5;
		return 5;
	}
	var writeString= function(value,pos,encoding) {
		encoding=encoding||'ucs2';
		if (value=="") throw "cannot write null string";
		if (encoding==='utf8')dbuf.write(DT.utf8,pos,1,'utf8');
		else if (encoding==='ucs2')dbuf.write(DT.ucs2,pos,1,'utf8');
		else throw 'unsupported encoding '+encoding;
			
		var len=Buffer.byteLength(value, encoding);
		dbuf.write(value,pos+1,len,encoding);
		
		if (pos+len+1>cur) cur=pos+len+1;
		return len+1; // signature
	}
	var writeStringArray = function(value,pos,encoding) {
		encoding=encoding||'ucs2';
		if (encoding==='utf8') dbuf.write(DT.utf8arr,pos,1,'utf8');
		else if (encoding==='ucs2')dbuf.write(DT.ucs2arr,pos,1,'utf8');
		else throw 'unsupported encoding '+encoding;
		
		var v=value.join('\0');
		var len=Buffer.byteLength(v, encoding);
		if (0===len) {
			throw "empty string array " +JSON.stringify(key_writing);
		}
		dbuf.write(v,pos+1,len,encoding);
		if (pos+len+1>cur) cur=pos+len+1;
		return len+1;
	}
	var writeI32=function(value,pos) {
		dbuf.write(DT.int32,pos,1,'utf8');
		dbuf.writeInt32BE(value,pos+1);
		if (pos+5>cur) cur=pos+5;
		return 5;
	}
	var writeUI8=function(value,pos) {
		dbuf.write(DT.uint8,pos,1,'utf8');
		dbuf.writeUInt8(value,pos+1);
		if (pos+2>cur) cur=pos+2;
		return 2;
	}
	var writeBool=function(value,pos) {
		dbuf.write(DT.bool,pos,1,'utf8');
		dbuf.writeUInt8(Number(value),pos+1);
		if (pos+2>cur) cur=pos+2;
		return 2;
	}		
	var writeBlob=function(value,pos) {
		dbuf.write(DT.blob,pos,1,'utf8');
		value.copy(dbuf, pos+1);
		var written=value.length+1;
		if (pos+written>cur) cur=pos+written;
		return written;
	}		
	/* no signature */
	var writeFixedArray = function(value,pos,unitsize) {
		//console.log('v.len',value.length,items.length,unitsize);
		if (unitsize===1) var func=dbuf.writeUInt8;
		else if (unitsize===4)var func=dbuf.writeInt32BE;
		else throw 'unsupported integer size';
		if (!value.length) {
			throw 'empty fixed array"'+JSON.stringify(key_writing)+'"';
		}
		for (var i = 0; i < value.length ; i++) {
			try {
				func.apply(dbuf,[value[i],i*unitsize+pos])	
			} catch(e) {
				throw e;
			}
			
		}
		var len=unitsize*value.length;
		if (pos+len>cur) cur=pos+len;
		return len;
	}

	this.writeI32=writeI32;
	this.writeBool=writeBool;
	this.writeBlob=writeBlob;
	this.writeUI8=writeUI8;
	this.writeString=writeString;
	this.writeSignature=writeSignature;
	this.writeOffset=writeOffset; //5 bytes offset
	this.writeStringArray=writeStringArray;
	this.writeFixedArray=writeFixedArray;
	Object.defineProperty(this, "buf", {get : function(){ return dbuf; }});
	
	return this;
}

var Create=function(path,opts) {
	opts=opts||{};
	var kfs=new Kfs(path,opts);
	var cur=0;

	var handle={};
	
	//no signature
	var writeVInt =function(arr) {
		var o=pack_int(arr,false);
		kfs.writeFixedArray(o,cur,1);
		cur+=o.length;
	}
	var writeVInt1=function(value) {
		writeVInt([value]);
	}
	//for postings,sorted array
	var writePInt =function(arr) {
		var o=pack_int(arr,true);
		kfs.writeFixedArray(o,cur,1);
		cur+=o.length;
	}
	//variable size int, not sorted , good for small ints
	var saveVInt = function(arr,key) {
		var start=cur;
		cur+=kfs.writeSignature(DT.vint,cur);
		writeVInt(arr);
		var written = cur-start;
		pushitem(key,written);
		return written;		
	}
	var savePInt = function(arr,key) {
		var start=cur;
		cur+=kfs.writeSignature(DT.pint,cur);
		writePInt(arr);
		var written = cur-start;
		pushitem(key,written);
		return written;	
	}

	
	var saveUI8 = function(value,key) {
		var written=kfs.writeUI8(value,cur);
		cur+=written;
		pushitem(key,written);
		return written;
	}
	var saveBool=function(value,key) {
		var written=kfs.writeBool(value,cur);
		cur+=written;
		pushitem(key,written);
		return written;
	}
	var saveI32 = function(value,key) {
		var written=kfs.writeI32(value,cur);
		cur+=written;
		pushitem(key,written);
		return written;
	}	
	var saveString = function(value,key,encoding) {
		encoding=encoding||stringencoding;
		var written=kfs.writeString(value,cur,encoding);
		cur+=written;
		pushitem(key,written);
		return written;
	}
	var saveStringArray = function(arr,key,encoding) {
		encoding=encoding||stringencoding;
		key_writing.push(key);
		try {
			var written=kfs.writeStringArray(arr,cur,encoding);
		} catch(e) {
			throw e;
		}
		cur+=written;
		pushitem(key,written);
		key_writing.pop();
		return written;
	}
	
	var saveBlob = function(value,key) {
		key_writing.push(key);
		var written=kfs.writeBlob(value,cur);
		cur+=written;
		pushitem(key,written);
		key_writing.pop();
		return written;
	}

	var folders=[];
	var pushitem=function(key,written) {
		var folder=folders[folders.length-1];	
		if (!folder) return ;
		folder.itemslength.push(written);
		if (typeof key=="string") {
			if (!folder.keys) {
				throw 'cannot have key in array';
			}
			folder.keys.push(key);
		}
	}	
	var open = function(opt) {
		var start=cur;
		var key=opt.key || null;
		var type=opt.type||DT.array;
		cur+=kfs.writeSignature(type,cur);
		cur+=kfs.writeOffset(0x0,cur); // pre-alloc space for offset
		var folder={
			type:type, key:key,
			start:start,datastart:cur,
			itemslength:[] };
		if (type===DT.object) folder.keys=[];
		folders.push(folder);
	}
	var openObject = function(key) {
		key_writing.push(key);
		open({type:DT.object,key:key});
	}
	var openArray = function(key) {
		key_writing.push(key);
		open({type:DT.array,key:key});
	}
	var saveInts=function(arr,key,func) {
		func.apply(handle,[arr,key]);
	}
	var close = function(opt) {
		if (!folders.length) throw 'empty stack';
		var folder=folders.pop();
		//jump to lengths and keys
		kfs.writeOffset( cur-folder.datastart, folder.datastart-5);
		var itemcount=folder.itemslength.length;
		//save lengths
		writeVInt1(itemcount);
		writeVInt(folder.itemslength);
		
		if (folder.type===DT.object) {
			//use utf8 for keys
			cur+=kfs.writeStringArray(folder.keys,cur,'utf8');
		}
		written=cur-folder.start;
		pushitem(folder.key,written);
		key_writing.pop();
		return written;
	}
	
	var stringencoding='ucs2';
	var stringEncoding=function(newencoding) {
		if (newencoding) stringencoding=newencoding;
		else return stringencoding;
	}
	
	var isIntArray_fast=function(arr) {
		if (arr.length<5) return isIntArray(arr);
		if (typeof arr[0]=='number'
		    && Math.round(arr[0])==arr[0] && arr[0]>=0)
			return true;
		return false;
	}

	// quick test if an array is sorted with Fibonacci
	var isSorted=function(arr) {
		var a=0,b=1,f=1;
		//quick check , last value should be more than length
		//for indexing partial taisho juan
		if (arr.length>arr[arr.length-1])return false;

		while (f<arr.length ) {
			f = a+b;
			if (arr[a]>arr[b]) return false;
			a=b;
			b=f;
		}
		return true;
	}

	var isStringArray_fast=function(arr) {
		if (arr.normalArray) return false;
		if (arr.length<5) return isStringArray(arr);
		if (typeof arr[0]=='string') return true;
		return false;
	}	
	var isIntArray=function(arr) {
		for (var i=0;i<arr.length;i++) {
			if (typeof arr[i]!=='number' && Math.round(arr[i])!==arr[i]) return false;
		}
		return true;
	}
	var isStringArray=function(arr) {
		for (var i=0;i<arr.length;i++) {
			if (typeof arr[i]!=='string') return false;
		}
		return true;
	}
	var getEncoding=function(key,encs) {
		var enc=encs[key];
		if (!enc) return null;
		if (enc=='delta' || enc=='posting') {
			return savePInt;
		} else if (enc=="variable") {
			return saveVInt;
		}
		return null;
	}
	var save=function(J,key,opts) {
		opts=opts||{};
		
		if (typeof J=="null" || typeof J=="undefined") {
			debugger;
			throw 'cannot save null value of ['+key+'] folders'+JSON.stringify(folders);
			return;
		}
		var type=J.constructor.name;
		if (type==='Object') {
			openObject(key);
			for (var i in J) {
				save(J[i],i,opts);
				if (opts.autodelete) delete J[i];
			}
			close();
		} else if (type==='Array') {
			if (isIntArray_fast(J)) {
				if (J.sorted || isSorted(J)) { //number array is sorted
					saveInts(J,key,savePInt);	//posting delta format
				} else {
					saveInts(J,key,saveVInt);	
				}
			} else if (isStringArray_fast(J)) {
				saveStringArray(J,key,J.enc);
			} else {
				openArray(key);
				for (var i=0;i<J.length;i++) {
					if (!J[i]) {
						console.error(J);
						throw "array has gap at "+i+" keys"+JSON.stringify(key_writing);
					}
					save(J[i],i,opts);
					if (opts.autodelete) delete J[i];
				}
				close();
			}
		} else if (type==='String') {
			saveString(J,key);
		} else if (type==='Number') {
			if (J>=0&&J<256) saveUI8(J,key);
			else saveI32(J,key);
		} else if (type==='Boolean') {
			saveBool(J,key);
		} else if (type==='Buffer') {
			saveBlob(J,key);
		} else {
			throw 'unsupported type '+type+" keys"+JSON.stringify(key_writing);
		}
	}
	
	var free=function() {
		while (folders.length) close();
		kfs.free();
	}
	var currentsize=function() {
		return cur;
	}

	Object.defineProperty(handle, "size", {get : function(){ return cur; }});

	var writeFile=function(fn,opts,cb) {
		var fs=require('fs');
		var totalbyte=handle.currentsize();
		var written=0,batch=0;
		
		if (typeof cb=="undefined" || typeof opts=="function") { //do not have
			cb=opts;
		}
		opts=opts||{};
		batchsize=opts.batchsize||1024*1024*16; //16 MB

		if (fs.existsSync(fn)) fs.unlinkSync(fn);

		var writeCb=function(total,written,cb,next) {
			return function(err) {
				if (err) throw "write error"+err;
				cb(total,written);
				batch++;
				next();
			}
		}

		var next=function() {
			if (batch<batches) {
				var bufstart=batchsize*batch;
				var bufend=bufstart+batchsize;
				if (bufend>totalbyte) bufend=totalbyte;
				var sliced=kfs.buf.slice(bufstart,bufend);
				written+=sliced.length;
				fs.appendFile(fn,sliced,writeCb(totalbyte,written, cb,next));
			}
		}
		var batches=1+Math.floor(handle.size/batchsize);
		next();
	}
	handle.free=free;
	handle.saveI32=saveI32;
	handle.saveUI8=saveUI8;
	handle.saveBool=saveBool;
	handle.saveString=saveString;
	handle.saveVInt=saveVInt;
	handle.savePInt=savePInt;
	handle.saveInts=saveInts;
	handle.saveBlob=saveBlob;
	handle.save=save;
	handle.openArray=openArray;
	handle.openObject=openObject;
	handle.stringEncoding=stringEncoding;
	//this.integerEncoding=integerEncoding;
	handle.close=close;
	handle.writeFile=writeFile;
	handle.currentsize=currentsize;
	return handle;
}

module.exports=Create;
},{"fs":undefined}],9:[function(require,module,exports){
const Ksanapos=require("ksana-corpus/ksanapos");

var knownPatterns={
	"pts":Ksanapos.buildAddressPattern([7,10,6,6]),
	"yinshun":Ksanapos.buildAddressPattern([7,11,5,6]),
	"taisho":Ksanapos.buildAddressPattern([6,13,5,5],3),
	"nanchuan":Ksanapos.buildAddressPattern([7,10,4,6]),
	"taixu":Ksanapos.buildAddressPattern([6,12,5,6]),
	"j13zs":Ksanapos.buildAddressPattern([4,13,4,6],4) //4 column per page
}
module.exports=knownPatterns;
},{"ksana-corpus/ksanapos":27}],10:[function(require,module,exports){
/* output to kdb format*/
const Kdbw=require("./kdbw");

const write=function(fn,rom,size,finishcb){
	var kdbw=Kdbw(fn,{size});
		
	//TODO remove kdbw dependency in corpus
	kdbw.save(rom,null);//,{autodelete:true}

	kdbw.writeFile(fn,function(total,written) {
		var progress=written/total;
		console.log(progress);
		if (finishcb && total==written) finishcb(total);
	});

}

module.exports={write:write};
},{"./kdbw":8}],11:[function(require,module,exports){
/*
	convert accelon3 format
*/
const sax="sax";
const fs=require("fs");
const format=require("./accelon3handler/format");
const note=require("./accelon3handler/note");
const a3Tree=require("./accelon3handler/tree");
const encodeSubtreeItem=require("./subtree").encodeSubtreeItem;
var parser;

var defaultopenhandlers={段:format.p,p:format.p,
	頁:format.pb,註:note.ptr,釋:note.def};
const defaultclosehandlers={釋:note.def};
const setHandlers=function(openhandlers,closehandlers,otherhandlers){

	this.openhandlers=Object.assign(openhandlers||{},defaultopenhandlers);	
	this.closehandlers=Object.assign(closehandlers||{},defaultclosehandlers);	
	this.otherhandlers=otherhandlers||{};
}
var tocobj=null;
const addContent=function(content,name,opts){
	opts=opts||{};
	const Sax=require("sax");
	parser = Sax.parser(true);
	var tagstack=[];
	var subtreeitems=[], subtreekpos=0;
	var corpus=this;
	corpus.content=content;
	

	if (opts.article && !this.openhandlers[opts.article]) {
		this.openhandlers[opts.article]=format.article;
		this.closehandlers[opts.article]=format.article;
	}

	const addLines=function(s){
		if( s=="\n" && this._pbline==0) return;//ignore crlf after <pb>
		var kpos;
		const lines=s.trim().split("\n");
		for (var i=0;i<lines.length;i++) {
			kpos=this.makeKPos(this.bookCount-1,this._pb-1,this._pbline+i,0);
			if (kpos==-1) {
				console.log("error kpos",this.bookCount-1,this._pb-1,this._pbline+i);
			}
			try{
				this.newLine(kpos, this.tPos);
			} catch(e) {
				console.log(e)
			}
			this.putLine(lines[i]);
		}
		this._pbline+=lines.length;

		if (this._pbline<this.addressPattern.maxline){
			kpos=this.makeKPos(this.bookCount-1,this._pb-1,this._pbline,0);
			this.setPos(kpos,this.tPos);			
		}
	}

	parser.ontext=function(t){
		if (!t||t=="undefined")return;

		if (t.indexOf("\n")==-1) {
			corpus.addText(t);	
		} else {
			var text=corpus.popBaseText(t);
			text+=t;
			addLines.call(corpus,text);
		}
		
		if (tocobj) tocobj.text+=t;
	}
	parser.onopentag=function(tag){
		var capturing=false,subtree=0;
		tagstack.push(tag);
		const handler=corpus.openhandlers[tag.name];
		const treetag=a3Tree.call(this,tag,parser);
	
		const depth=treetag.indexOf(tag.name);

		if (depth>-1) {
			if(tocobj)throw "nested Toc "+tag.name+" line:"+parser.line;
			if (opts.subtoc) {
				const subtreerootdepth=treetag.indexOf(opts.subtoc);
				subtree=depth>subtreerootdepth?subtreerootdepth:0;
			}
			tocobj={tag:tag.name,kpos:corpus.kPos,text:"",depth:depth,subtree:subtree};
		} 
		if (handler&&handler.call(corpus,tag)) {
			capturing=true;
		} else if (corpus.otherhandlers.onopentag) {
			capturing=corpus.otherhandlers.onopentag.call(corpus,tag);
		}

		if (capturing){
			corpus.textstack.push("");
			if (corpus.textstack.length>2) {
				throw "nested text too depth (2)"+tag.name
				+JSON.stringify(tag.attributes)+corpus.textstack;
			}			
		}
	}

	parser.onclosetag=function(tagname){
		var tag=tagstack.pop();
		const handler=corpus.closehandlers[tagname];

		if (tocobj && tagname==tocobj.tag){
			if (tocobj.subtree){ //is a subtree
				subtreeitems.push(encodeSubtreeItem(tocobj));
			} else {
				corpus.putField("toc",tocobj.depth+"\t"+tocobj.text,tocobj.kpos);	
				if (subtreeitems.length){
					corpus.putField("subtoc",subtreeitems,subtreekpos);
					corpus.putField("subtoc_range",corpus.kPos,subtreekpos);
					subtreeitems=[];	
				}
				subtreekpos=tocobj.kpos;
			}
			tocobj=null;
		}
		
		//corpus.kPos;
		if (handler) {
			handler.call(corpus,tag,true);
		} else if (corpus.otherhandlers.onclosetag) {
			corpus.otherhandlers.onclosetag.call(corpus,tag,true);
		}
	}	
	const finalize=function(){
		if(subtreeitems.length) {
			corpus.putField("subtoc",subtreeitems,subtreekpos);
			corpus.putField("subtoc_range",corpus.kPos,subtreekpos);
		}
	}

	parser.write(content);
	finalize();
}
const addFile=function(fn,opts){
	//remove bom
	const encoding=opts.encoding||"utf8";
	var content=fs.readFileSync(fn,encoding).replace(/\r?\n/).trim();
	this.filename=fn;
	addContent.call(this,content,fn,opts);
}
const line=function(){
	return parser.line;
}
module.exports={addFile:addFile,addContent:addContent,setHandlers:setHandlers,line:line};
},{"./accelon3handler/format":1,"./accelon3handler/note":2,"./accelon3handler/tree":3,"./subtree":15,"fs":undefined,"sax":43}],12:[function(require,module,exports){
const fs=require("fs");
var setHandlers=function(openhandlers,closehandlers,otherhandlers){
	this.openhandlers=openhandlers||{};	
	this.closehandlers=closehandlers||{};
	this.otherhandlers=otherhandlers||{};
}

var addFile=function(fn,opts){
	const encoding=opts.encoding||"utf8";
	var content=fs.readFileSync(fn,"utf8").replace(/\r?\n/g,"\n");
	this.filename=fn;
	addContent.call(this,content,fn,opts);
}
var linetext;
var addContent=function(content,name,opts){
	var i=0,tag="",text="",c,kpos=0,linetext;
	content=this.otherhandlers.onContent?this.otherhandlers.onContent(content):content;
	while (i<content.length) {
		c=content[i];
		if (c==="~"||c==="@"||c==="#") {
			this.addText(text);
			text="";
			tag+=c;
			c=content[++i];
			while (i<content.length && ((c>="0" && c<="9")||c==".")||c=="\n") {
				tag+=c;
				c=content[++i];
			}

			this.otherhandlers.onTag?this.otherhandlers.onTag.call(this,tag):null;
			tag="";
		} else if (c==="^") {
			this.addText(text);
			text="";
			tag+=c;
			c=content[++i];
			while (i<content.length && c!=="\n") {
				tag+=c;
				c=content[++i];
			}
			if (c=="\n") i++;

			this.otherhandlers.onTag?this.otherhandlers.onTag.call(this,tag):null;
			tag="";
		} else {
			if (c=="\n") { 
				this.addText(text);
				text="";

				linetext=this.popBaseText();
				this.putLine(linetext);
				const kpos=this.nextLine( this.kPos);
				this.newLine( kpos ,this.tPos);
			} else {
				text+=c;	
			}
			i++;
		}
	}
	this.addText(text);

	linetext=this.popBaseText();
	this.putLine(linetext);

}
const line=function(){
	return linetext;
}
module.exports={addFile:addFile,addContent:addContent,setHandlers:setHandlers,line:line};
},{"fs":undefined}],13:[function(require,module,exports){
const Sax=require("sax");
const fs=require("fs");
var parser;
const setHandlers=function(openhandlers,closehandlers,otherhandlers){
	this.openhandlers=openhandlers||{};	
	this.closehandlers=closehandlers||{};
	this.otherhandlers=otherhandlers||{};
}
const addContent=function(content,name,opts){
	parser = Sax.parser(true);
	var tagstack=[];
	
	var corpus=this;
	corpus.content=content;
	parser.ontext=function(t){
		if (!t||t=="undefined")return;
		corpus.addText(t);			
	}
	parser.onopentag=function(tag){
		tagstack.push(tag);
		const handler=corpus.openhandlers[tag.name];
		var capture=false;
		corpus.position=this.position;
		if (handler&&handler.call(corpus,tag)) {
			capture=true;
		} else if (corpus.otherhandlers.onopentag) {
			capture=corpus.otherhandlers.onopentag.call(corpus,tag);
		}
		if (capture){
			corpus.textstack.push("");
			if (corpus.textstack.length>opts.maxTextStackDepth) {
				throw "nested text too depth "+tag.name
				+JSON.stringify(tag.attributes)+"line:"+parser.line+
				corpus.textstack;
			}			
		}
	}

	parser.onclosetag=function(tagname){
		var tag=tagstack.pop();
		const handler=corpus.closehandlers[tagname];
		corpus.position=this.position;
		if (handler) {
			handler.call(corpus,tag,true);
		} else if (corpus.otherhandlers.onclosetag) {
			corpus.otherhandlers.onclosetag.call(corpus,tag,true);
		}
	}	
	parser.write(content);
}
const addFile=function(fn,opts){
	//remove bom
	const encoding=opts.encoding||"utf8";
	var content=fs.readFileSync(fn,encoding).replace(/\r?\n/).trim();
	this.filename=fn;
	addContent.call(this,content,fn,opts);
}
const line=function(){
	return parser.line;
}
module.exports={addFile:addFile,addContent:addContent,setHandlers:setHandlers,line:line};
},{"fs":undefined,"sax":43}],14:[function(require,module,exports){
var Ksanapos=require("ksana-corpus/ksanapos");
var bsearch=require("ksana-corpus/bsearch");
const Romable=function(opts){
	opts=opts||{};
	var fields={},afields={},texts=[];
	var token_postings={};
	var articlecount=0;

	var rom={texts:texts,fields:fields,afields:afields};
	const putField=function(name,value,kpos,storepoint){
		if (typeof storepoint!=="undefined") {
			if (!fields[name]) fields[name]={}; //storepoint as key
			if (!fields[name][storepoint]) {
				fields[name][storepoint]=[];
			}
			fields[name][storepoint].push([kpos,value]);
		} else {
			if (!fields[name]) fields[name]=[];
			fields[name].push([kpos,value]);
		}
	}
	const putArticle=function(value,kpos){
		articlecount++;
		articlepos=null;//invalidate build time articlepos
		putField("article",value,kpos);
	}

	var articlepos=null,articlename=null;

	const findArticle=function(kRange_address){
		var kRange=kRange_address;
		const pat=this.addressPattern;
		if (typeof kRange_address=="string") {
			kRange=Ksanapos.parse(kRange_address,pat);
		}
		const range=Ksanapos.breakKRange(kRange,pat);
		if (!articlepos) {
			articlepos=[],articlename=[];
			fields.article.forEach(function(a){
				articlepos.push(a[0]);
				articlename.push(a[1]);
			});
		}
		var at=bsearch(articlepos,range.start+1,true)-1;
		return at;
	}

	const putAField=function(name,value,kpos,article){
		const a=article||articlecount-1;
		if (a<0)return;
		if (!afields[a]) {
			afields[a]={};
		}
		if (!afields[a][name]) {
			afields[a][name]=[];
		}
		afields[a][name].push([kpos,value]);
	}

	const getField=function(name,book){
		if (typeof book!=="undefined") {
			return fields[name][book];
		} else {
			return fields[name];	
		}
	}

	const getAField=function(article,name){
		if (typeof name!=="undefined"){
			return fields[article][name];	
		} else {
			return fields[article];
		}
	}

	const getAFields=function(article){
		return afields;
	}
	const putLine=function(line,kpos){
		var p=Ksanapos.unpack(kpos,this.addressPattern);
		const bk=p[0]-1,pg=p[1],ln=p[2];
		if (!texts[bk])texts[bk]=[];
		if (!texts[bk][pg])texts[bk][pg]=[];

		const thispage=p[1];
		var prevpage=thispage-1;
		while (prevpage>0 && !texts[bk][prevpage]) {
			texts[bk][prevpage--]=[" "]; //fill up the empty page with pseudo line
		}
		
		if (!line && !ln) line=" ";//first line cannot empty, array might have one item only, causing total len=0
		/*
		if (line && p[2] && texts[p[0]][p[1]][0]==" ") {
			texts[p[0]][p[1]][0]=" ";//set first line to empty if more than one item
		}
		*/
		var prev=ln-1;
		//prevent gap in array.
		while (prev>=0 && !texts[bk][pg][prev]) {
			texts[bk][pg][prev]=" ";
			prev--;
		}
		texts[bk][pg][ln]=line;
	}

	const getTexts=function(){
		return texts;
	}

	const invertAField=function(name,pos,value,inverttype){
		if (inverttype=="startend_unsorted") {
			putField(name+"_start", value[0],pos[0]);
			putField(name+"_end", value[value.length-1],pos[pos.length-1]);
		}
	}

	const finalizeAFields=function(){
		for (article in afields) {
			const afield=afields[article];

			for (name in afield) {
				const field=afield[name];
				var pos=[],value=[];

				hasvalue=field[0][1]!==null;
				field.sort(function(a,b){return a[0]===b[0]?(a[1]-b[1]):a[0]-b[0]}); //make sure kpos is in order

				for (j=0;j<field.length;j++){
					pos.push(field[j][0]);
					if (hasvalue) value.push(field[j][1]);
				}
				afield[name]={pos:pos};
				if (value.length) afield[name].value=value;

				if(opts.invertAField&&opts.invertAField[name]){
					invertAField(name,pos,value,opts.invertAField[name]);	
				}				
			}
		}
		return afields;
	}

//optimize for jsonrom
//convert to column base single item array
//kpos use vint and make use of stringarray
	const finalizeFields=function(){
		var i,j,k,f,hasvalue;
		for (i in fields) {
			var pos=[], value=[], field=fields[i];

			if (field instanceof Array) { 
				hasvalue=field[0][1]!==null;
				field.sort(function(a,b){return a[0]===b[0]?(a[1]-b[1]):a[0]-b[0]}); //make sure kpos is in order
				for (j=0;j<field.length;j++){
					pos.push(field[j][0]);
					if (hasvalue) value.push(field[j][1]);
				}
				fields[i]={pos:pos};
				if (value.length) fields[i].value=value;
			} else {
				for (k in field) {// per book field
					f=field[k]; pos=[],value=[];
					hasvalue=f[0][1]!==null;
					f.sort(function(a,b){
						return a[0]===b[0]?(a[1]-b[1]):a[0]-b[0];
					}); //make sure kpos and value is sorted,
					//sort value is kpos is the same
					for (j=0;j<f.length;j++){
						pos.push(f[j][0]);
						if (hasvalue) value.push(f[j][1]);
					}
					field[k]={pos:pos};
					if (value.length) field[k].value=value;
				}
			}
		}
		return fields;
	}


	const buildROM=function(meta,inverted){
		const afields=finalizeAFields();
		const fields=finalizeFields();
		const r={meta:meta,texts:texts};

		if (inverted){
			r.inverted=inverted.finalize();
		}
		if (Object.keys(fields).length) r.fields=fields;
		if (Object.keys(afields).length) r.afields=afields;
		return r;
	}

	return {putLine:putLine,
		putArticle:putArticle,
		putField:putField,putAField:putAField,
		getAField:getAField,getAFields:getAFields,
		getField:getField,buildROM:buildROM,findArticle:findArticle};
}
module.exports=Romable;
},{"ksana-corpus/bsearch":17,"ksana-corpus/ksanapos":27}],15:[function(require,module,exports){
const encodeSubtreeItem=function(tocobj){
	return (tocobj.depth-(tocobj.subtree||0))+"\t"+tocobj.text+"\t"+tocobj.kpos.toString(36);
}
const decodeSubtreeItem=function(str){
	const r=str.split("\t");
	return {depth:r[0],text:r[1],kpos:parseInt(r[2],36)};
}
module.exports={encodeSubtreeItem:encodeSubtreeItem,decodeSubtreeItem:decodeSubtreeItem}
},{}],16:[function(require,module,exports){
const Ksanapos=require("./ksanapos");
const bsearch=require("./bsearch");

const getArticleTPos=function(at){
	const article2tpos=this.get(["inverted","article2tpos"]);
	var start=0,end=0;
	if (article2tpos && at>=0 && at<=article2tpos.length) {
		start=article2tpos[at];
		if (at>=article2tpos.length) {
			end=this.meta.endtpos;
		} else {
			end=article2tpos[at+1];
		}
	}
	return {start:start,end:end};
}
const articleOf=function(kRange_address){
	var kRange=kRange_address;
	const pat=this.addressPattern;
	if (typeof kRange_address=="string") {
		kRange=Ksanapos.parse(kRange_address,pat);
	}
	const range=Ksanapos.breakKRange(kRange,pat);

	const articlepos=this.get(["fields","article","pos"]);
	const articlename=this.get(["fields","article","value"]);
	if (!articlepos) return null;

	var at=bsearch(articlepos,range.start+1,true);
	var start=articlepos[at-1];
	if (!start) {
		at=1;
		start=articlepos[0];
	}
	var end=articlepos[at];

	const r=adjustArticleRange.call(this,start,end);
	const tpos=getArticleTPos.call(this,at-1);

	return {at:at-1, articlename:articlename[at-1],
		tstart:tpos.start,tend:tpos.end, 
	 start:r.start,startH:this.stringify(r.start),end:r.end,endH:this.stringify(r.end)};
}

const getArticleName=function(id){
	const articlenames=this.get(["fields","article","value"]);
	return articlenames[id];
}

//warning , if no article tag at begining of file.
//fetching last article of previous file will truncate the upper part
const adjustArticleRange=function(start,end){
	const pat=this.addressPattern;
	if (typeof end=="undefined") end=this.meta.endpos;

	//cross book article, adjust start to begining of end book
	if (this.bookOf(end)>this.bookOf(start)) {
		const endbookbegin=Ksanapos.makeKPos([this.bookOf(end),0,0,0],pat);
		if (endbookbegin==end) { // end at start book
			end=Ksanapos.makeKPos([this.bookOf(start),pat.maxpage-1,pat.maxline-1,0],pat);
 		} else {  //starts from begining of end book
 			start=endbookbegin;	
 		}		
	}
	return {start:start,end:end};
}

const getArticle=function(at,nav) {
	const articlepos=this.get(["fields","article","pos"]);
	const articlename=this.get(["fields","article","value"]);
	if (!articlepos) return null;

	if (typeof id_name==="string") {
		at=articlename.indexOf(id_name);
	}
	if (at<0) return null;

	at+=(nav||0);
	var start=articlepos[at];
	var end=articlepos[at+1];
	if (!start)return null;
	if (typeof end=="undefined") end=this.meta.endpos;

	const r=adjustArticleRange.call(this,start,end);
	const tpos=getArticleTPos.call(this,at);

	return {at:at, articlename:articlename[at], end:r.end, start:r.start,
		tstart:tpos.start,tend:tpos.end
		,startH:this.stringify(r.start),end:r.end,endH:this.stringify(r.end) };
}
const articleCount=function(){
	const articlename=this.get(["fields","article","value"]);
	return articlename.length;
}

const trimArticleField=function(allfields,article){
	const s=bsearch(allfields.pos,article.start,true);
	const e=bsearch(allfields.pos,article.end,true);
	return {pos:allfields.pos.slice(s,e+1),value:allfields.value.slice(s,e+1)};
}
module.exports={getArticle:getArticle,articleOf:articleOf,articleCount:articleCount,
getArticleName:getArticleName,adjustArticleRange:adjustArticleRange,trimArticleField:trimArticleField}
},{"./bsearch":17,"./ksanapos":27}],17:[function(require,module,exports){
'use strict';
var indexOfSorted = function (array, obj, near) {
  var low = 0, high = array.length, mid;
  while (low < high) {
    mid = (low + high) >> 1;
    if (array[mid] === obj) return mid;
    array[mid] < obj ? low = mid + 1 : high = mid;
  }
  if (near) return low;
  else if (array[low] === obj) return low;else return -1;
};
var indexOfSorted_str = function (array, obj, near) { 
  var low = 0,
  high = array.length;
  while (low < high) {
    var mid = (low + high) >> 1;
    if (array[mid]===obj) return mid;
    //(array[mid].localeCompare(obj)<0) ? low = mid + 1 : high = mid;
    array[mid]<obj ? low=mid+1 : high=mid;
  }
  if (near) return low;
  else if (array[low]===obj) return low;else return -1;
};


var bsearch=function(array,value,near) {
	var func=indexOfSorted;
	if (typeof array[0]=="string") func=indexOfSorted_str;
	return func(array,value,near);
}

module.exports=bsearch;
},{}],18:[function(require,module,exports){
/*
	Coordinate transformation between kpos and codemirror line ch
*/
const bsearch=require("./bsearch");
const textutil=require("./textutil");
//get the byte distance from kpos to begining of logical line
//a logical line might span across multiple raw line
const getUnicodeCharDis=function(firstline,kpos,loglineKPos,getRawLine){	
	var linedis=this.bookLineOf(kpos)-this.bookLineOf(loglineKPos);
	var chardis=0;

	var ln1=this.bookLineOf(loglineKPos)-firstline;
	while (linedis) {
		const rawline=getRawLine(ln1);
		if (!rawline) break;
		ln1++;
		chardis+=rawline.length;
		linedis--;
	}
	return chardis;
}
//convert kpos to codemirror line:ch
const toLogicalPos=function(linebreaks,kpos,getRawLine,omitpunc,omitendingpunc) {
	if (typeof kpos=="string") {
		const k=textutil.parseRange.call(this,kpos);
		kpos=k.start;
	}
	const line=bsearch(linebreaks,kpos+1,true)-1;
	const loglineKPos=linebreaks[line];//kPos of logical line
	const eoff  =this.charOf(loglineKPos);
	const firstline=this.bookLineOf(linebreaks[0]);
	const chardis=getUnicodeCharDis.call(this,firstline,kpos,loglineKPos,getRawLine);
	const l1=getRawLine(this.bookLineOf(kpos)-firstline);
	var ch=textutil.trimRight.call(this,l1,this.charOf(kpos),omitpunc).length;
	const paragraphfirstline=getRawLine(this.bookLineOf(loglineKPos)-firstline);
	 
	if (omitendingpunc) {
		while (ch&&textutil.isPunc.call(this,l1.charCodeAt(ch-1))) ch--;
	}
	const prevcount=textutil.trimRight.call(this,paragraphfirstline,eoff,omitpunc).length;

	return {line:line,ch:ch+chardis-prevcount};
}
const toLogicalRange=function(linebreaks,address,getRawLine){ //find logical line
	var krange=textutil.parseRange.call(this,address);
	var start=toLogicalPos.call(this,linebreaks,krange.start,getRawLine,this.meta.removePunc,false);
	var end=toLogicalPos.call(this,linebreaks,krange.end,getRawLine,this.meta.removePunc,true);
	if (krange.start==krange.end) {
		start=end;
	}

	return {start:start,end:end};
}
const fromLogicalPos=function(textline,ch,startkpos,firstline,getRawLine,oneline){
	const start=this.bookLineOf(startkpos)||0;
	var line=getRawLine(start-firstline);
	if (!line) return 1;
	
	var offset=textutil.trimRight.call(this,line,this.charOf(startkpos),true).length;
	if ((line.length-offset)>=ch || oneline) { //ch is in this line
		return startkpos+this.kcount(textline.substr(0,ch));
	}
	line=line.substr(offset);
	var now=start;
	while (ch>line.length) { //decrease ch with length of raw line
		ch-=line.length;
		++now;
		line=getRawLine(now-firstline);
		if (typeof line=="undefined") {
			console.error("raw line not found",now-firstline);
			return startkpos;
		}
	}
	t=line.substr(0,ch); //remain text from closest raw line till pos::ch
	return textutil.advanceLineChar.call(this,startkpos,now-start,t);
}

module.exports={toLogicalPos:toLogicalPos,toLogicalRange:toLogicalRange,fromLogicalPos:fromLogicalPos};
},{"./bsearch":17,"./textutil":29}],19:[function(require,module,exports){
const bsearch=require("./bsearch");
const Ksanapos=require("./ksanapos");
const Ksanacount=require("./ksanacount");
const createTokenizer=require("./tokenizer").createTokenizer;
const textutil=require("./textutil");
const coordinate=require("./coordinate");
const TOC=require("./toc");
const gettext=require("./gettext");
const getfield=require("./getfield");
const tpos=require("./tpos");
const article=require("./article");
const group=require("./group");
const parseRange=function(krange){
	return textutil.parseRange.call(this,krange,this.addressPattern,true);
}

const stringify=function(krange_kpos,kend){
	const pat=this.addressPattern;
	if (kend) return Ksanapos.stringify(Ksanapos.makeKRange(krange_kpos,kend,pat),pat,true);
	return Ksanapos.stringify(krange_kpos,pat);
}

const makeKRange=function(kstart,kend){
	return Ksanapos.makeKRange(kstart,kend,this.addressPattern);
}

const makeKPos=function(nums){
	return Ksanapos.makeKPos(nums,this.addressPattern);	
}
const isRange=function(range){
	const rr=textutil.parseRange.call(this,range,this.addressPattern,true);
	return rr.end>rr.start;
}

//get a juan and break by p
const init=function(engine){
	engine.addressPattern=Ksanapos.buildAddressPattern(engine.meta.bits,engine.meta.column);
	engine.tokenizer=createTokenizer(engine.meta.versions.tokenizer);
	engine.getArticle=article.getArticle;
	engine.getField=getfield.getField;
	engine.getBookField=getfield.getBookField;
	engine.getArticleField=getfield.getArticleField;
	engine.trimField=getfield.trimField;
	engine.getFieldNames=getfield.getFieldNames;
	engine.findAField=getfield.findAField;
	engine.getPages=gettext.getPages;
	engine.getText=gettext.getText;
	engine.articleOf=article.articleOf;
	engine.bookOf=textutil.bookOf;
	engine.pageOf=textutil.pageOf;
	engine.pageStart=textutil.pageStart;
	engine.lineOf=textutil.lineOf;
	engine.charOf=textutil.charOf;
	engine.stringify=stringify;
	engine.makeKRange=makeKRange;
	engine.makeKPos=makeKPos;
	engine.parseRange=parseRange;
	engine.isRange=isRange;
	engine.getArticleText=gettext.getArticleText;
	engine.getArticleTextTag=gettext.getArticleTextTag;
	engine.getArticleName=article.getArticleName;
	engine.articleCount=article.articleCount
	engine.extractKPos=textutil.extractKPos;
	engine.toLogicalRange=coordinate.toLogicalRange;
	engine.toLogicalPos=coordinate.toLogicalPos;
	engine.fromLogicalPos=coordinate.fromLogicalPos;
	engine.layoutText=textutil.layoutText;
	engine.bookLineOf=textutil.bookLineOf;
	engine.getTOC=TOC.getTOC;
	engine.getSubTOC=TOC.getSubTOC;
	engine.addressRegex=/@([\dpabcd]+-[\dabcd]+);?/g;
	engine.kcount=Ksanacount.getCounter(engine.meta.language);
	engine.knext=Ksanacount.getNext(engine.meta.language);
	engine.tPosToKRange=tpos.tPosToKRange;
	engine.groupNames=group.groupNames;
	engine.groupKPoss=group.groupKPoss;
	engine.groupTPoss=group.groupTPoss;
	engine.groupKRange=group.groupKRange;
	engine.groupTRange=group.groupTRange;
	engine.groupArticles=group.groupArticles;
	engine.getTitle=group.getTitle;
	engine.getGroupName=group.getGroupName;
	engine.groupOf=group.groupOf;
	engine.getGroupTOC=TOC.getGroupTOC;
	engine.cachedSubTOC={};
	engine.cachedTOC=[];
	engine.fromTPos=tpos.fromTPos;
	engine.cachedPostings={};
}

module.exports={init:init};
},{"./article":16,"./bsearch":17,"./coordinate":18,"./getfield":22,"./gettext":23,"./group":24,"./ksanacount":26,"./ksanapos":27,"./textutil":29,"./toc":30,"./tokenizer":31,"./tpos":34}],20:[function(require,module,exports){
/* Corpus Engine 
   provide core interface to make use of ksana corpus
*/
const JsonRom=require("ksana-jsonrom");
const Corpus=require("./corpus");

var opening="";
var pool={};

const close=function(id) {
	var engine=pool[id];
	if (engine) {
		engine.kdb.free();
		delete pool[id];
	}
}

const createEngine=function(id,kdb,opts,cb){//preload meta and other fields
	if (typeof opts=="function") {
		cb=opts;
		opts={};
	}
	var engine={kdb:kdb};

	engine.get=require("./get"); //install first API

	if (kdb.fs.mergePostings) { //native mergePostings
		engine.mergePostings=kdb.fs.mergePostings.bind(kdb.fs);
	}

	opts.preload=opts.preload||[]; //user specified preload
	var preload=[["meta"]
	,["fields","article"]
	,["fields","toc"],["fields","subtoc_range"],["fields","group"]
	];
  if (!opts.textOnly) {
    preload.push(["inverted","book2tpos"]
    	,["inverted","article2tpos"]
    	,["inverted","tokens"]
    	,["inverted","posting_length"]
    	,["inverted","groupnames"]
    	,["inverted","group2tpos"]
    	);
  }	
	opts.preload.forEach(function(p){preload.push(p)});

	engine.get(preload,{recursive:true},function(res){
		engine.meta=res[0];
		engine.id=id;
		Corpus.init(engine);
		cb(0,engine);
	});
}

const prepareEngine=function(id,kdb,opts,cb){
	createEngine(id,kdb,opts,function(err2,engine){
		opening="";
		if (err2) cb(err2);
		else {
			if (engine&&engine.meta){
				pool[id]=engine;
				cb&& cb(0,engine);						
			} else {
				cb&&cb(id+" is invalid");
			}
		} 
	});
}
const open=function(id,opts,cb){
	if (typeof opts=="function") {
		cb=opts;
		opts={};
	}
	var timer=0;
	if (opening) {
		timer=setInterval(function(){
			if (!opening) {
				clearInterval(timer);
				_open(id,opts,cb);
			}
		} ,200);
	} else {
		return _open(id,opts,cb);
	}
}
const isNode=function(){
	return (typeof process!=="undefined") &&
	process.versions && process.versions.node;
}
const _open=function(id,opts,cb){
	var engine=pool[id];
	if (engine) {
		cb&&cb(0,engine);
		return engine;
	}

	var fn=id;
	if (fn.indexOf(".cor")==-1) fn+=".cor";

	opening=id;
	opts=opts||{};
	if ((typeof window!=="undefined" && window.node_modules)||isNode()) {
		fn2="../"+id+"-corpus/"+fn; //for nw
	} else {
		fn2=id+"-corpus/"+fn;
	}
	new JsonRom.open(fn,function(err,kdb){
		if (err) {
			new JsonRom.open(fn2,function(err2,kdb2){
				if (err2) {
					opening="";
					cb&&cb(err2);
				} else {
					prepareEngine(id,kdb2,opts,cb)
				}
			});
		} else {
			prepareEngine(id,kdb,opts,cb)
		}
	});
}
const isBusy=function(){
	return !!opening;
}
module.exports={open:open,close:close,isBusy:isBusy};
},{"./corpus":19,"./get":21,"ksana-jsonrom":36}],21:[function(require,module,exports){
var gets=function(paths,opts,cb) { //get many data with one call

	if (!paths) return ;
	if (typeof paths=='string') {
		paths=[paths];
	}
	var engine=this, output=[], taskqueue=[];
	if (opts.syncable) opts.syncable=false;

	var makecb=function(path){
		return function(data){
				if (!(data && typeof data =='object' && data.__empty)) output.push(data);
				engine.get(path,opts,taskqueue.shift());
		};
	};

	for (var i=0;i<paths.length;i++) {
		if (typeof paths[i]=="null") { //this is only a place holder for key data already in client cache
			output.push(null);
		} else {
			taskqueue.push(makecb(paths[i]));
		}
	};

	taskqueue.push(function(data){
		output.push(data);
		cb.apply(engine.context||engine,[output,paths]); //return to caller
	});

	taskqueue.shift()({__empty:true}); //run the task
}


var get=function(path,opts,cb) {
	var engine=this;

	if (typeof opts=="function") {
		context=cb;
		cb=opts;
		opts={recursive:false};
	}
	opts=opts||{};

	if (!path) {
		cb&&cb([null]);
		return null;
	}

	if (typeof cb!="function") {
		if (typeof path[0] =="object") {
			return path.map(function(p){
				return engine.kdb.get(p,opts);	
			})
		}
		else return engine.kdb.get(path,opts);
	}

	if (typeof path==="string") {
		path=[path];
	}

	if (typeof path[0] =="string") {
		return engine.kdb.get(path,opts,function(data){
			cb(data);//return top level keys
		});
	} else if (typeof path[0] =="object") {
		return gets.call(engine,path,opts,function(data){
			cb(data);//return top level keys
		});
	} else {
		engine.kdb.get([],opts,function(data){
			cb(data);//return top level keys
		});
	}
};	

module.exports=get;
},{}],22:[function(require,module,exports){
const bsearch=require("./bsearch");

const getField=function(name,cb){
	if (typeof name=="object") {
		return getFields.call(this,name,cb);
	}
	return this.get(["fields",name],{recursive:true},cb);
}
const getFields=function(names,cb){
	const keys=names.map(function(name){return ["fields",name]});
	return this.get(keys,{recursive:true},cb);	
}
const getBookField=function(name,book,cb){
	if (typeof name=="object") {
		return getBookFields.call(this,name,book,cb);
	}
	return this.get(["fields",name,book],{recursive:true},cb);	
}
const getBookFields=function(names,book,cb){
	const keys=names.map(function(name){return ["fields",name,book]});
	return this.get(keys,{recursive:true},cb);		
}

const getArticleField=function(narticle,name,cb){
	var article=narticle;
	if (typeof narticle=="number") {
		article=this.getArticle(narticle);
	}
	var names=name;
	if (typeof name=="string") names=[name]

	const keys=names.map(function(n){return ["afields",article.at,n]});

	return this.get(keys,{recursive:true},cb);
}

const getFieldNames=function(cb){
	const r=this.get(["fields"],function(data){return cb(Object.keys(data))});
	return r?Object.keys(r):[];
}
const findAField=function(afield,address,cb){
	if (!this.meta.invertAField || !this.meta.invertAField[afield]) return;

	this.getField([afield+"_start",afield+"_end"],function(datum){ 
		const start=datum[0],end=datum[1];
		var i=0;

		for (i=0;i<start.value.length;i++) {
			if (address>=start.value[i] && address<=end.value[i]) break;
		}

		if (i==start.value.length) {
			cb(0,"address not found");
			return;
		}

    //find corpus address by pbaddress
    this.getArticleField(i,afield,function(data2){
      const at2=bsearch(data2.value,address);//
      if (at2>0) {
      	cb(0,data2.pos[at2-1])
      } else {
      	cb("address "+address+" not found in article"+(at));
      }
    });
  }.bind(this));
}
const trimField=function(field,start,end){
	var out={};

	const s=bsearch(field.pos,start+1,true);
	const e=bsearch(field.pos,end,true);

	for (var key in field){
		out[key]=field[key].slice(s,e);
	}
	return out;
}

module.exports={getField:getField,getFields:getFields,
	getBookFields:getBookFields,getBookField:getBookField,
	getArticleField:getArticleField,getFieldNames:getFieldNames,
findAField:findAField,trimField:trimField}
},{"./bsearch":17}],23:[function(require,module,exports){
const Ksanapos=require("./ksanapos");
const textutil=require("./textutil");
const makeBookKey=function(s,e,hascol){
	return ["texts",e[0]-1];	
}

const makePageKeys=function(s,e,column,maxpage){//without col
	var keys=[],pg;
	var bk=s[0]-1; //only bk start from 1, pg,line,ch starts from 0
	var startpage=s[1];
	var endpage=e[1];
	if (e[0]>s[0]) {//crossing book, article start at ends of file
		endpage=maxpage;
	}
	for (pg=startpage;pg<=endpage;pg++) {
		if (pg>=maxpage) break;
		keys.push(["texts",bk,pg]);	
	}
	return keys;
}

const trimpages=function(kRange,pages,cb){
	var out=[],i;
	const r=textutil.parseRange.call(this,kRange,this.addressPattern,true);
	const pat=this.addressPattern;
	var startpage=r.startarr[1];
	var endpage=r.endarr[1];
	const startline=r.startarr[2];
	if (r.endarr[0]>r.startarr[0]) {
		endpage=startpage+pages.length;
	}

	for (i=startpage;i<=endpage;i++){
		if (typeof pages[i-startpage]=="undefined")continue;
		var pg=JSON.parse(JSON.stringify(pages[i-startpage]));
		if (i!=endpage){ //fill up array to max page line
			while (pg.length<pat.maxline) pg.push("");
		}
		const removePunc=!!this.get("meta").removePunc;

		if (i==endpage) {//trim following
			pg.length=r.endarr[2]+1;
			pg[pg.length-1]=textutil.trimRight.call(this,pg[pg.length-1],r.endarr[3],removePunc);
		}
		if (i==startpage) {
			pg=pg.slice(startline);
			pg[0]=textutil.trimLeft.call(this,pg[0],r.startarr[3]);
		}
		out=out.concat(pg);
	}

	cb&&cb(out);
	return out;
}

const getPages=function(kRange,cb) {
	const r=textutil.parseRange.call(this,kRange,this.addressPattern,true);
	const column=this.addressPattern.column;
	const bookkey=makeBookKey(r.startarr,r.endarr,column);

	const fetchpages=function(data){
		if (!data) {
			cb&&cb([]);
			return;
		}
		const maxpage=data.length;
		var keys=makePageKeys(r.startarr,r.endarr,column,maxpage);
		//not calling cb if already in cache
		var singlekey=false;
		if (keys.length==1) {
			singlekey=true;
			keys=keys[0];
		}
		var cb2=function(d2){
			if (singlekey) cb([d2]);
			else cb(d2);
		};
		if (!cb) cb2=null;
		const res=this.get(keys,{recursive:true,syncable:true},cb2);
		
		return singlekey?[res]:res;
	}

	const pages=this.get(bookkey,{syncable:true},function(data){
		fetchpages.call(this,data);
	}.bind(this));

	if (pages) {
		return fetchpages.call(this,pages);
	}
	return pages;
}

const getText=function(kRange,cb){ //good for excerpt listing
	//call getPages
	if (typeof kRange==="object") {
		return getTexts.call(this,kRange,cb);
	}
	var cbtimer=null;
	var cb2=function(pages){
		cbtimer=setTimeout(function(){
			trimpages.call(this,kRange,pages,cb);
		}.bind(this),1);
	}.bind(this);
	if (!cb) cb2=null;
	var stockpages=getPages.call(this,kRange,cb2);

	if (typeof stockpages!=="undefined"&&
		typeof stockpages!=="string"&&
		typeof stockpages[0]!=="undefined") {
		clearTimeout(cbtimer);
		return trimpages.call(this,kRange,stockpages,cb);
	}
}

const getArticleText=function(id_name,cb){
	const article=this.getArticle(id_name);
	if (!article) {
		cb(null)
		return null;		
	}

	var krange=Ksanapos.makeKRange(article.start,article.end,this.addressPattern);

	return getText.call(this,krange,cb);
}

const getArticleTextTag=function(id_name,fieldnames,cb){
	const article=this.getArticle(id_name);
	if (!article) {
		cb(null)
		return null;		
	}

	var krange=Ksanapos.makeKRange(article.start,article.end,this.addressPattern);
	getText.call(this,krange,function(text){
		if (!text) {
			cb(null);
			return null;
		}
		if (!fieldnames.length) {
			cb({text:text});
			return;
		}
		this.getArticleField(article.at,fieldnames,function(values){
			var fields={};
			values.forEach(function(v,idx){
				fields[fieldnames[idx]]=v;
			});
			cb({text:text,fields:fields});
		});
	}.bind(this));
}
const getTexts=function(kRanges,cb){
	if (!kRanges || !kRanges.length) {
		cb([]);
		return;
	}
	var output=[];
	var jobs=JSON.parse(JSON.stringify(kRanges));
	const fire=function(kRange){
		getText.call(this,kRange,function(data){
			output.push(data);
			if (jobs.length) {
				fire.call(this,jobs.shift());			
			} else {
				cb(output);
			}
		}.bind(this));
	}	
	fire.call(this,jobs.shift());
}
module.exports={getText:getText,getArticleText:getArticleText,
	getArticleTextTag:getArticleTextTag,getPages:getPages}
},{"./ksanapos":27,"./textutil":29}],24:[function(require,module,exports){
const bsearch=require("./bsearch");
const groupNames=function(){
	return this.get(["fields","group","value"]);
}
const groupKPoss=function(){
	return this.get(["fields","group","pos"]);
}
const groupTPoss=function(){
	return this.get(["inverted","group2tpos"]);
}

const groupKRange=function(g){
	const kposs=groupKPoss.call(this);
	const last=this.meta.endpos;
	const start=kposs[g],end=kposs[g+1];

	if (!start) return [0,last];
	if (!end) return [start,last];
	return [start,end];
}
const groupTRange=function(g){
	const tposs=groupTPoss.call(this);
	const last=this.meta.endtpos;
	const start=tposs[g],end=tposs[g+1];

	if (!start) return [0,last];
	if (!end) return [start,last];
	return [start,end];
}
//return group of articles containing address
const groupArticles=function(address){
	var kpos;
	if (typeof address=="number") kpos=address;
	else {
		const r=this.parseRange(address);
		kpos=r.start;		
	}
	const kposs=this.groupKPoss.call(this);
	const at=bsearch(kposs,kpos+10,true)-1;

	const range=this.groupKRange.call(this,at);

	const articlepos=this.get(["fields","article","pos"]);
	const articlename=this.get(["fields","article","value"]);

	var out=[];
	for (var i=0;i<articlepos.length;i++) {
		const vpos=articlepos[i];
		if (vpos>=range[0] && vpos<range[1]) {
			out.push(this.getArticle(i));
		}
	}
	return out;
}
const getTitle=function(address,sep){
	const groupname=getGroupName.call(this,address);
	const article=this.articleOf(address);

	return groupname+(sep||"-")+article.articlename;
}
const getGroupName=function(address,shortname){
	const groupNames=this.groupNames();
	if (!groupNames) return "";
	const at=groupOf.call(this,address);
	var groupname=groupNames[at]||"";
	groupname=shortname?groupname.substr(0,groupname.indexOf(";")):groupname.substr(groupname.indexOf(";")+1)	
	return groupname;
}
const groupOf=function(address){
	const r=this.parseRange(address);
	const kpos=r.start;
	const kposs=this.groupKPoss.call(this);

	var groupname="";
	const at=kposs?bsearch(kposs,kpos+10,true)-1:0;
	return at;
}
module.exports={groupNames:groupNames,groupKPoss:groupKPoss,
groupTPoss:groupTPoss,groupKRange:groupKRange,groupTRange:groupTRange,
groupArticles:groupArticles,getTitle:getTitle,getGroupName:getGroupName,
groupOf:groupOf};
},{"./bsearch":17}],25:[function(require,module,exports){
const Engine=require("./engine");
const bsearch=require("./bsearch");
const trimArticleField=require("./article").trimArticleField;
const openCorpus=function(id,opts,readycb){
	if (typeof opts=="function") {
		readycb=opts;
		opts={};
	}

	if (id instanceof Array) {
		for (var i=0;i<id.length;i++) {
			Engine.open(id[i],opts);
		}
		const opentimer=setInterval(function(){
			if (!Engine.isBusy()){
				clearInterval(opentimer);
				readycb&&readycb();
			}
		},100);
	} else {
		return Engine.open(id,opts,readycb);
	}
}
const parseLink=require("./parselink");
module.exports={openCorpus:openCorpus,bsearch:bsearch,parseLink:parseLink
,trimArticleField:trimArticleField};
},{"./article":16,"./bsearch":17,"./engine":20,"./parselink":28}],26:[function(require,module,exports){
/*
	given a string , return count
*/
var parseIDS=require("./tokenizer").parseIDS;

const isWestern=function(c){
return (c>=0x41&&c<=0x5a) ||(c>=0x61&&c<=0x7a)
			|| (c>=0x100&&c<=0x17f) ||(c>=0x1e00&&c<=0x1eff)
}
const pali=function(t) {
	var i=0,r=0,c,wlen;
	while (i<t.length) {
		wlen=0;
		c=t.charCodeAt(i);
		while (i<t.length&&!isWestern(c)) {
			i++;
			c=t.charCodeAt(i);
		}
		while (i<t.length&&isWestern(c)) {
			i++;
			c=t.charCodeAt(i);
			wlen++;
		}
		if (wlen) r++;
	}
	return r;
}
const cjk_nopunc=function(t){
	var i=0,r=0;
	while (i<t.length) {
		var code=t.charCodeAt(i);
		if ((code>=0x3400 && code<=0x9fff)
			||(code>=0x3040 && code<=0x30FF) //kana
			||(code>=0xE000 && code<=0xFAFF) //pua && supplement
			||(code>=0x2e80 && code<=0x2fff) //radicals
			||(code>=0x3100 && code<=0x31BF) //bopomofo
			) {
			r++;
		} else if (code>=0xd800&&code<=0xdfff) {
			r++;
			i++;
		} else if (code>=0x2ff0&&code<=0x2fff) {

			throw "ids not supported yet"
		}

		i++;
	}
	return r;
}
var pali_next=function(t,adv){
	var r=0,i=0,adv=adv||0,wlen;
	if (!t)return 0;
	while (r<adv && i<t.length){
		code=t.charCodeAt(i);
		c=t.charCodeAt(i);
		wlen=0;
		while (i<t.length&&!isWestern(c)) {
			i++;
			c=t.charCodeAt(i);
		}
		while (i<t.length&&isWestern(c)) {
			i++;
			c=t.charCodeAt(i);
			wlen++;
		}
		if (wlen) r++;
	}
	return i;
}

var cjk_next=function(t,adv){
	var r=0,i=0,adv=adv||0;
	if (!t)return 0;
	while (r<adv && i<t.length){
		code=t.charCodeAt(i);
		if (code>=0xd800&&code<=0xdfff) {
			r++;
			i++;
		} else if (code>=0x2ff0&&code<=0x2fff) {
			var c=parseIDS(t.substr(i));
			r++;
			i+=c;
		} else if ((code>=0x3400 && code<=0x9fff	)
			||(code>=0x3040 && code<=0x30FF) //kana
			||(code>=0xE000 && code<=0xFAFF) //pua && supplement
			||(code>=0x2e80 && code<=0x2fff) //radicals
			||(code>=0x3100 && code<=0x31BF)) {//bopomofo) {
			r++;
		}
		i++;		
	}

	return i;
}
var cjk=function(t){
	var i=0,r=0;
	while (i<t.length){
		code=t.charCodeAt(i);
		if (code>=0xd800&&code<=0xdfff) {
			r++;
			i++;
		} else if (code>=0x2ff0&&code<=0x2fff) {
			var c=parseIDS(t.substr(i));
			r++;
			i+=c;
		} else if ( (code>=0x3400 && code<=0x9fff)
			||(code>=0x3040 && code<=0x30FF) //kana
			||(code>=0xE000 && code<=0xFAFF) //pua && supplement
			||(code>=0x2e80 && code<=0x2fff) //radicals
			||(code>=0x3100 && code<=0x31BF)){ //bopomofo) {
			r++;
		}
		i++;
	}
	return r;
}
/*
const getRawToken=function(obj){
	var i=0,r=0;
	var t=obj.str;
	code=t.charCodeAt(i);
	if ((code>=0x3400 && code<=0x9fff)
			||(code>=0x3040 && code<=0x30FF) //kana
			||(code>=0xE000 && code<=0xFAFF) //pua && supplement
			||(code>=0x2e80 && code<=0x2fff) //radicals
			||(code>=0x3100 && code<=0x31BF) //bopomofo
			|| (code>=0xd800&&code<=0xdfff)) {
		i++;
		if (code>=0xd800&&code<=0xdfff) i++;
	} else if (code>=0x2ff0&&code<=0x2fff) {
		var c=parseIDS(t.substr(i));
		i+=c;
	} else if (code>0x20 && code<1024 ) {
		i++;
		while (i<t.length && t.charCodeAt(i)<1024) {
			i++;
		}
	} else {
		i++;
	}

	//tailing blank
	while (i<t.length && (t.charCodeAt(i)<=32 || t[i]==="　"))i++;

	obj.str=t.substr(i);
	return t.substr(0,i);
}*/
const getCounter=function(language){
	if (language==="classical_chinese") {
		return cjk_nopunc;
	} else if (language==="pali") {
		return pali;
	}
	return cjk;
}
const getNext=function(language) {
	if (language==="classical_chinese") {
		return cjk_next;
	} else if (language==="pali") {
		return pali_next;
	}
	return cjk_next;	
}
module.exports={cjk:cjk,cjk_nopunc:cjk_nopunc,parseIDS:parseIDS,getCounter:getCounter,getNext:getNext};
},{"./tokenizer":31}],27:[function(require,module,exports){
const buildAddressPattern=function(b,column){
	const bookbits=b[0],pagebits=b[1],linebits=b[2], charbits=b[3];
	if (charbits*2+linebits*2+pagebits*2+bookbits>53) {
		throw "address has more than 53 bits";
	}
	if (linebits>6 || charbits>6) {
		throw "max line/char bits is 6";
	}
	const maxchar=1<<(charbits);
	const maxline=1<<(linebits);
	const maxpage=1<<(pagebits);
	const maxbook=1<<(bookbits);
	var rangebits=charbits+linebits+pagebits;
	const maxrange=1<<(rangebits);
	const bits=[bookbits,pagebits,linebits,charbits];
	const kposbits=bookbits+pagebits+linebits+charbits;
	return {maxbook:maxbook,maxpage:maxpage,maxline:maxline,maxchar:maxchar
		,maxrange:maxrange,bits:bits,kposbits:kposbits,
					bookbits:bookbits,pagebits:pagebits,linebits:linebits,charbits:charbits,rangebits:rangebits,column:column};
}
var checknums=function(nums,pat){
	if (nums[3]>=pat.maxchar) {
		console.error(nums[3],"exceed maxchar",pat.maxchar)
		return 0;
	}
	if (nums[2]>=pat.maxline) {
		console.error(nums[2],"exceed maxline",pat.maxline)
		return 0;
	}
	if (nums[1]>=pat.maxpage) {
		console.error(nums[1],"exceed maxpage",pat.maxpage)
		return 0;
	}
	if (nums[0]>=pat.maxbook) {
		console.error(nums[0],"exceed maxbook",pat.maxbook)
		return 0;
	}
	return 1;
}
var makeKPos=function(nums,pat){
	var i,mul=1, kpos=0;
	for (i=0;i<nums.length;i++) {
		if (nums[i]<0) {
			console.error("negative value",nums[i],nums);
			return -1;
		}
	}
	var checknumerror=false;
	if(!checknums(nums,pat)) {
		//auto fix line and char,normally book and page will not exceed
		checknumerror=true;
		if (nums[2]>=pat.maxline) {
			nums[2]=pat.maxline-1;
		}
		if (nums[3]>=pat.maxchar) {
			nums[3]=pat.maxchar-1;
		}		
	}

	kpos=nums[3];       mul*=Math.pow(2,pat.charbits);
	kpos+= nums[2]*mul; mul*=Math.pow(2,pat.linebits);
	kpos+= nums[1]*mul; mul*=Math.pow(2,pat.pagebits);
	kpos+= nums[0]*mul;

	if (checknumerror) {
		console.error("kpos trimmed",stringifyKPos(kpos,pat),nums);
	}

	return kpos;
}
//kstart might be zero if book=0,page=0,line=0,ch=0
const breakKRange=function(kRange,pat,forceRange){
	if (forceRange||isRange(kRange,pat)){
		var r=Math.pow(2,pat.rangebits);
		var dis=Math.floor(kRange%r);
		start=Math.floor(kRange/r);
		end=start+dis;		
		return {start:start,end:end};
	} else {
		return {start:kRange,end:kRange};
	}
}
const makeKRange=function(startkpos,endkpos,pat){
	if (isNaN(startkpos)||isNaN(endkpos)) {
		return 0;
	}
	
	if (startkpos>endkpos) {
		const t=startkpos;
		startkpos=endkpos;
		endkpos=t;
	}

	var r=endkpos-startkpos;
	if (r>pat.maxrange) {
		//throw "range too far "+ r;
		r=pat.maxrange-1;
	}
	const maxrange=Math.pow(2,pat.rangebits);
	if (r>=maxrange) r=maxrange-1;
	return startkpos*maxrange+r;
}
var unpack=function(kpos,pat){
//	kpos--;
	var ch=kpos%pat.maxchar;
	var line=Math.floor((kpos/pat.maxchar)%pat.maxline);
	var page=Math.floor((kpos/ Math.pow(2,pat.charbits+pat.linebits)) %pat.maxpage);
	var vol=Math.floor((kpos/Math.pow(2,pat.charbits+pat.linebits+pat.pagebits))%pat.maxbook);

	var r=[vol,page,line,ch];
	return r;
}
const stringifyKPos=function(kpos,pat){
	const parts=unpack(kpos,pat);
	var s= (parts[0])+'p';
	if (pat.column){//for taisho
		s+=Math.floor(parts[1]/pat.column)+1;	
		s+=String.fromCharCode((parts[1]%pat.column)+0x61);
	} else {
		s+=(parts[1]+1);
		s+='.';
	}
	line='0'+(parts[2]+1);
	s+=line.substr(line.length-2);
	ch='0'+(parts[3]);
	s+=ch.substr(ch.length-2);
	return s;
}
//not valid if kpos_start==0
const isRange=function(k,pat){
	return (k/Math.pow(2,pat.kposbits))>1;
}
const stringify=function(krange_kpos,pat){
	if (isRange(krange_kpos,pat)) {
		const r=breakKRange(krange_kpos,pat);
		var e=stringifyKPos(r.end,pat);
		var at=e.indexOf("p");
		e=e.substr(at+1); //remove vol
		const s=stringifyKPos(r.start,pat);
		const sarr=unpack(r.start,pat), earr=unpack(r.end,pat);

		if (sarr[1]!==earr[1]) { //different page
			if (pat.column) {
				if (Math.floor(sarr[1]/pat.column)==Math.floor(earr[1]/pat.column)) {
					return s+'-'+e.substr(e.length-5);//end page is omitted
				}
			}
			return s+'-'+e;
		} else if (sarr[2]!==earr[2]) { //diffrent line
			return s+'-'+e.substr(e.length-4);
		} else if (sarr[3]!==earr[3])	{ //different char
			return s+'-'+e.substr(e.length-2);
		}
		return s;
	} else {
		return stringifyKPos(krange_kpos,pat);
	}
}

/* convert human readible address to an integer*/
const parseLineChar=function(arr,linech,remain){
	if (linech.length<3) {
		arr[remain?3:2 ]=parseInt(linech,10)- (remain?0:1) ;// if remain part, it is ch, otherwise line
	} else {
		arr[2]=parseInt(linech.substr(0,2),10)-1;  //first two is line
		arr[3]=parseInt(linech.substr(2,2),10); //ch is one or two byte
	}
}
const regexFollow1=/(\d+)([a-z\.])(\d+)/
const regexFollow2=/([a-z])(\d+)/
const regexFollow3=/(\d+)/
const parseRemain=function(remain,pat,arr){ //arr=[book,page,col,line,ch]
	var m=remain.match(regexFollow1);
	var start=makeKPos(arr,pat);

	if (!m) {
		m=remain.match(regexFollow2); // have column and line and ch
		if (!m) {
			m=remain.match(regexFollow3); //only have line and ch
			if (!m) return start;

			parseLineChar(arr,m[1],true);
		} else {
			arr[1]=Math.floor(arr[1]/3);
			arr[1]=arr[1]*pat.column+(parseInt(m[1],36)-10);

			parseLineChar(arr,m[2],true);			
		}
	} else { //has page, col
		arr[1]=parseInt(m[1],10)-1;  //page start from 0
		if (pat.column) {
			arr[1]=arr[1]*pat.column+(parseInt(m[2],36)-10);
		}
		parseLineChar(arr,m[3]);
	}

	var end=makeKPos(arr,pat);
	if (end<start) {
		console.error("end bigger than start",arr);
		return start+1;
	}
	return end;
}
const regexAddress=/(\d+)p(\d+)([a-z\.])(\d+)/
const regexAddressShort=/(\d+)p(\d+)([a-f\.]?)/

const parse=function(address,pat){
	var m=address.match(regexAddress);
	if (!m) {
		m=address.match(regexAddressShort);
	}
	if (!m) return null;
	var arr=[0,0,0,0];//book,page,col,line,ch

	arr[0]=parseInt(m[1],10); 
	arr[1]=parseInt(m[2],10)-1;
	if (pat.column) {
		var c=(m[3]=="."||!m[3])?"a":m[3];
		arr[1]=arr[1]*pat.column+(parseInt(c,36)-10);
	}
	
	if (m.length>4){
		parseLineChar(arr,m[4]);
	}
	var start=makeKPos(arr,pat);
	var end=start;

	const at=address.indexOf("-");
	if (at>-1) {
		remain=address.substr(at+1);
		end=parseRemain(remain,pat,arr);
	}
	//} else {
	//	end+=1;
	//}
	
	return makeKRange(start,end,pat);
}
const bookStartPos=function(kpos,pat){
	var arr=unpack(kpos,pat);
	arr[2]=0,arr[3]=0;
	return makeKPos(arr,pat);
}
module.exports={parse:parse,buildAddressPattern:buildAddressPattern,makeKPos:makeKPos,
	makeKRange:makeKRange,breakKRange:breakKRange,unpack:unpack,stringify:stringify,bookStartPos:bookStartPos};
},{}],28:[function(require,module,exports){
const openCorpus=require("./engine").open;
const parseLink=function(fulladdress,cb){
	const r=fulladdress.split("@");
	if (r.length!==2) {
		cb&&cb(null);
		return null;
	}

	if (r[0]=="Taisho") {
		openCorpus(r[0].toLowerCase(),function(err,cor){
			if (err) {
				cb&&cb(null);
				return null;
			}
			const n=r[1].split("p");
			console.log("taisho number",n[0],"number",n[1]);
		});
	} else {
		const out={corpus:r[0],address:r[1]};
		cb&&cb(out);
		return out;
	}
	return null;
}
module.exports=parseLink;
},{"./engine":20}],29:[function(require,module,exports){
const Ksanapos=require("./ksanapos");
const tt=require("./tokentypes");
const TokenTypes=tt.TokenTypes;

const isPunc=function(c){
	const c2tt=this.tokenizer.code2TokenType;
	return (c2tt[c]===TokenTypes.PUNC || c2tt[c]===TokenTypes.SPACE);
}
const trimRight=function(str,chcount,includePunc) {
	if (!str) return "";
	var c=chcount,dis=0,t,s=str,code;

	t=this.knext(s,c);
	dis+=t;
	
	s=s.substr(t);
	code=s.charCodeAt(0);
	if (includePunc && chcount) { //
		while (isPunc.call(this,code)) {
			s=s.substr(1);
			code=s.charCodeAt(0);
			dis++;
		}	
	}
	
	return str.substr(0,dis);
}


const trimLeft=function(str,chcount) {
	if (!str) return "";
	var c=chcount,dis=0,t,s=str;
	t=this.knext(s,c);
	dis+=t;
	s=s.substr(t);
	while (chcount&&(s.charCodeAt(0)<0x3400||s.charCodeAt(0)>0xdfff)){
		s=s.substr(1);
		dis++;
	}
	return str.substr(dis);
}
const layoutText=function(text,startkpos,breaks){
		var page=0,prevpage=0,lines=[],linetext="";
		var linebreaks=[],pagebreaks=[],kpos=startkpos,nbreak=0;
		var nextkpos;//kpos of next line start
		
		for (var i=0;i<text.length;i++) {
			nextkpos=advanceLineChar.call(this,startkpos,i+1);
			page=this.pageOf(kpos)-1;
			if (prevpage!==page) {
				while (lines.length>0&&!lines[lines.length-1].trim()) { 
					linebreaks.pop();
					lines.pop(); //remove extra tailing blank lines
				}
				pagebreaks.push(kpos); //show page break on screen
			}
			if (breaks) {
				var breakcount=0,t=text[i],consumed=0;
				//one text line might consist more than one p
				while (nbreak<breaks.length&&nextkpos>breaks[nbreak]) {
					breakcount++;
					const leftpart=trimRight.call(this,text[i],breaks[nbreak]-kpos,true);
					lines.push(linetext+leftpart.substr(consumed));
					consumed=leftpart.length;
					linetext="";
					nbreak++;
				} 
				
				if (!breakcount) {
					linetext+=text[i];
				} else {
					linetext=text[i].substr(consumed);//remaining
				}
			} else {
				lines.push(text[i].replace(/\r?\n/g," "));
				linebreaks.push(kpos);				
			}
			prevpage=page;
			kpos=nextkpos;
		}
		if (breaks) {
			linebreaks=breaks;
			linebreaks.unshift(startkpos);
			lines.push(linetext);
		}
		return {linebreaks:linebreaks,pagebreaks:pagebreaks,lines:lines};
}
const extractKPos=function(text){
	var out={},pat=this.addressPattern,articleOf=this.articleOf.bind(this);
	text.replace(this.addressRegex,function(m,m1){
		const kRange=Ksanapos.parse(m1,pat);
		if (typeof kRange!=="undefined") {
			var f=articleOf(kRange);
			if (!f.articlename) return;
			if (!out[f.articlename]) out[f.articlename]=[];
			out[f.articlename].push(kRange);
		}
	});
	return out;
}
/*
  add advline to kpos and return new kpos 
  advline can be more than maxChar
	crossing vol is not allowed
*/

const advanceLineChar=function(kpos,advline,linetext){
	const pat=this.addressPattern;
	kpos+=advline*pat.maxchar;
	
	if (linetext) {
		var arr=Ksanapos.unpack(kpos,pat);
		arr[3]=this.kcount(linetext);
		return Ksanapos.makeKPos(arr,pat);
	} else {
		return kpos;
	}
}
const parseRange=function(kRange,pat){
	if (typeof pat=="undefined") pat=this.addressPattern;
	if (typeof kRange=="string") {
		kRange=Ksanapos.parse(kRange,pat);
	}
	const r=Ksanapos.breakKRange(kRange,pat);
	
	const startarr=Ksanapos.unpack(r.start,pat);
	var endarr=Ksanapos.unpack(r.end,pat);
	return {startarr:startarr,endarr:endarr,start:r.start,end:r.end,kRange:kRange};
}

const kPosUnpack=function(kpos,pat){
	pat=pat||this.addressPattern;
	const startarr=Ksanapos.unpack(kpos,pat);
	return startarr;
}

const bookOf=function(address){
	const r=parseRange(address,this.addressPattern);
	const arr=kPosUnpack.call(this,r.start);
	return arr[0];
}
const pageOf=function(address){
	const r=parseRange(address,this.addressPattern);
	const arr=kPosUnpack.call(this,r.start);
	return arr[1];
}
const bookLineOf=function(address){ //line counting from this book
	const r=parseRange(address,this.addressPattern);
	const arr=kPosUnpack.call(this,r.start);
	return arr[1]*this.addressPattern.maxline+arr[2];
}
const lineOf=function(address){
	const r=parseRange(address,this.addressPattern);
	const arr=kPosUnpack.call(this,r.start);
	return arr[2];
}
const charOf=function(address){
	const r=parseRange(address,this.addressPattern);
	const arr=kPosUnpack.call(this,r.start);
	return arr[3];
}
const pageStart=function(address){//return address of begining of page
	const r=parseRange(address,this.addressPattern);
	const arr=kPosUnpack.call(this,r.start);
	const pat=this.addressPattern;
	arr[2]=0;
	arr[3]=0;
	return Ksanapos.makeKPos(arr,pat);
}
module.exports={trimLeft:trimLeft,trimRight:trimRight,parseRange:parseRange,
	bookOf:bookOf,pageOf:pageOf,lineOf:lineOf,charOf:charOf,pageStart:pageStart,
	bookLineOf:bookLineOf,	layoutText:layoutText,isPunc:isPunc,
	extractKPos:extractKPos,advanceLineChar:advanceLineChar};
},{"./ksanapos":27,"./tokentypes":33}],30:[function(require,module,exports){
const getTOC=function(){
	return this.getField("toc");
}

const getGroupTOC=function(group,cb){
	group=parseInt(group)||0;
	if (group<0){
		cb&&cb([]);
		return;
	}
	const r=this.groupKRange(group);
	const articles=this.getField("article").value;
		
	const subtoc_range=this.getField("subtoc_range");
	var keys=[] ,subtoc_title=[];
	for (var i=0;i<subtoc_range.value.length;i++) {
		if (subtoc_range.pos[i]>=r[0] && r[1]>subtoc_range.pos[i]) {
			subtoc_title.push("0\t"+articles[i]+"\t"+subtoc_range.pos[i].toString(36)); //see ksana-corpus-builder/subtree
			keys.push(["fields","subtoc","value",i]);
		}
	}
	
	this.get(keys,function(res){
		var out=[];
		var groupname=this.groupNames()[group];
		if (!groupname) {
			debugger;
			groupname="";
		}

		groupname=groupname.substr(groupname.indexOf(";")+1);
		out.push("0\t"+groupname+"\t"+r[0].toString(36));
		for (var j=0;j<res.length;j++) {
			out=out.concat(res[j]);
		}
		cb(out);
	}.bind(this))
}
const getSubTOC=function(kpos,cb){ //get toc containing kpos
	const subtoc_range=this.getField("subtoc_range");
	if (!subtoc_range) return [];
	var keys=[],out=[],needfetch=false;
	for (var i=0;i<subtoc_range.pos.length;i++) {
		const start=subtoc_range.pos[i];
		const end=subtoc_range.value[i];
		if (kpos>=start && kpos<end) {
			if (this.cachedSubTOC[i]) {
				out.push(this.cachedSubTOC[i]);
			} else {
				needfetch=true;
				keys.push( ["fields","subtoc","value",i] );				
			}
		}
	}

	if (!needfetch) {
		cb&&cb(out);
		return out;
	} 
	
	const parseSubTOC=function(rawsubtoc){
		var out=[];
		for (var i=0;i<rawsubtoc.length;i++) {
			const fields=rawsubtoc[i].split("\t");
			out.push({d:parseInt(fields[0],10),
								t:fields[1],
								p:parseInt(fields[2],36)})
		}
		return out;
	}

	this.get(keys,{recursive:true},function(data){
		for (var i=0;i<keys.length;i++){
			const nsubtoc=keys[i][3];
			this.cachedSubTOC[nsubtoc] = parseSubTOC(data[i]);
			out.push(this.cachedSubTOC[nsubtoc]);
		}
		cb(out);
	}.bind(this));
}
module.exports={getTOC:getTOC,getSubTOC:getSubTOC,getGroupTOC:getGroupTOC};
},{}],31:[function(require,module,exports){
const tt=require("./tokentypes");
const TokenTypes=tt.TokenTypes;

var parseIDS=function(str){ //return number of char used by one IDS
	var count=0,i=0;
	while (count!==1&&i<str.length) {
		var code=str.charCodeAt(i);
		if (code>=0x2ff0 && code<=0x2ffb) {
			count--;//two operands
			if (code===0x2ff2 || code===0x2ff3) count--; //three operands
		} else count++;
		i++;
	}
	return i;
}
/* break a string into tokens 
each token 
['trimmed token','raw token',offset,tokentype]
*/
const tokenize=function(s){
	const c2tt=this.code2TokenType;

	var i=0,out=[],tk;
	while (i<s.length) {
		tk="";
		var type=c2tt[s.charCodeAt(i)];
		if (type==TokenTypes.SURROGATE) {
			tk=s.substr(i,2);
			out.push([tk,null,i,type]);
			i+=2;
			type=c2tt[s.charCodeAt(i)];
		} else if (type===TokenTypes.IDC) {
			var c=parseIDS(s.substr(i));
			tk=s.substr(i,c);
			out.push([tk,null,i,type]);
			i+=c;
			type=c2tt[s.charCodeAt(i)];
		} else if (type===TokenTypes.CJK || type===TokenTypes.PUNC) {
			tk=s.substr(i,1);
			out.push([tk,null,i,type]);
			i++;
			type=c2tt[s.charCodeAt(i)];
		} else if (type===TokenTypes.TIBETAN || type===TokenTypes.LATIN|| type===TokenTypes.NUMBER) {
			tk=s.substr(i,1);
			out.push([tk,null,i,type]);
			i++;
			var leadtype=type;
			while (i<s.length) {
				var code=s.charCodeAt(i);
				var type=c2tt[code];
				if (type!=leadtype) break;
				tk+=s.substr(i,1);
				i++;
			}
			out[out.length-1][0]=tk;
		} else {
			i++;//unknown
		}
		
		if (type===TokenTypes.SPACE)	{
			if (tk==="") out.push([tk,null,i,type]);
			while (i<s.length) {
				tk+=s.substr(i,1);
				i++;
				var code=s.charCodeAt(i);
				var type=c2tt[code];
				if (type!==TokenTypes.SPACE) break;
			}
		}
		out.length&&(out[out.length-1][1]=tk);//token with tailing spaces
	}
	return out;
}

const createTokenizer=function(version){
	const code2TokenType=tt.getCode2TokenTypeMap(version);
	return {tokenize:tokenize, TokenTypes:TokenTypes , version:version, code2TokenType:code2TokenType};
}

module.exports={createTokenizer:createTokenizer,parseIDS:parseIDS,latest:1};
},{"./tokentypes":33}],32:[function(require,module,exports){
module.exports="48 10N7 26A6 26A133 128A3600 48T3648 256A256 112P3600 352C16 15I2 63P192C768 27648C14336 257S8191 512P1025 1P6 2P2 1P1 1P11 2P3 1P65 1P2 2P154 ";
},{}],33:[function(require,module,exports){
const TokenTypes={//cannot use number, for RLE encoding
	SPACE:' ',
	SURROGATE:'S',
	CJK:'C',
	NUMBER:'N',
	TIBETAN:'T',
	LATIN:'A',
	IDC:'I',
	PUNC:'P'
}
var map=[];
const unpackRLE=function(str){
	var i=0,o="";
	str.replace(/(\d+)(.)/g,function(m,m1,m2){
		for (i=0;i<parseInt(m1,10);i++) {
			o+=m2;
		}
	})
	return o;
}
const buildMap=function(){
	const tokentypemap=unpackRLE(require("./tokentypemap"));
	if (tokentypemap.length!==65536) {
		throw "token map unpack error";
	}
	map=tokentypemap.split("");
	Object.freeze(map);
}
const getCode2TokenTypeMap=function(ver){//now only have one version
	if (!map.length) buildMap();
	return map;
}

module.exports={TokenTypes:TokenTypes,getCode2TokenTypeMap:getCode2TokenTypeMap};
},{"./tokentypemap":32}],34:[function(require,module,exports){
/* Token Postion */
const bsearch=require("./bsearch");
const Ksanapos=require("./ksanapos");
const TT=require("./tokentypes").TokenTypes;
const prevline=function( kpos, line2tpos, at, adv){
	var r=Ksanapos.unpack(kpos,this.addressPattern);
	while (adv) {
		if (r[2]>0) {
			r[2]--;
			at--;
		} else {
			at--;
			while (at>0&& line2tpos[at]==line2tpos[at-1]) at--;
			const newline = at % this.addressPattern.maxline;
			r[1]--;
			r[2]=newline;
		}
		adv--;
	}
	const k=Ksanapos.makeKPos(r,this.addressPattern);
	return {kpos:k,at:at};
}
/* TODO , check next line crossing a book */
const nextline=function( kpos,line2tpos, at,adv ){
	var r=Ksanapos.unpack(kpos,this.addressPattern);
	while (adv>0) {
		while (at<line2tpos.length-1 && line2tpos[at]==line2tpos[at+1]) {
			at++;
		}
		at++;
		const newline=at % this.addressPattern.maxline;
		if (newline<r[2]) r[1]++;
		r[2] = newline;
		adv--;
	}
	const k=Ksanapos.makeKPos(r,this.addressPattern);
	return {kpos:k, at:at};
}
const absline2kPos=function(bk,page_col_line,C,R) { //see inverted.js putLinePos
  return bk*R + page_col_line*C ;
}	
const calKCharOffset=function(tokencount,line,removePunc){
	if (!tokencount) return 0;
	const tokenized=this.tokenizer.tokenize(line);
	var i=0;
	while (i<tokenized.length && tokencount) {
		tokencount-=twidth(tokenized[i][3],removePunc);
		i++;
	}
	if (!tokenized[i]) return 0;
	return this.kcount(line.substr(0,tokenized[i][2]));
}
const tPos2KPos=function(tposs,extraline,linetext,_linetpos,bookline2tpos,bookof){
	const C=Math.pow(2,this.addressPattern.charbits);
	const R=Math.pow(2,this.addressPattern.rangebits);
	const removePunc=!!this.get("meta").removePunc;

	const getLine=function(hittpos,line2tpos){
		if (_linetpos[0] instanceof Array) { //range format , for read text
			for (var i=0;i<_linetpos.length;i++) {
				if (hittpos>=_linetpos[i][0] && hittpos<=_linetpos[i][1]) break;
			}
		} else { //excerpt format, tpos of each line , including end tpos of last line for trimming posting
			for (var i=0;i<_linetpos.length;i++) {
				if (_linetpos[i]>hittpos) break;
			}
			if(i) i--;
		}

		const line=linetext[i]; // the actual line
		return line;
	}
	var kposs=[], 
	  line2tpos_at=[] , //line with hit
	  linetpos=[];      //tpos of staring and ending line, for filtering postings
	for (var i=0;i<tposs.length;i++) {
		const line2tpos=bookline2tpos[bookof[i]];
		if (!line2tpos) {
			throw "cannot get bookline2tpos of book"+bookof[i];
		}
		var at=bsearch(line2tpos,tposs[i],true);
		if (line2tpos[at]>tposs[i]) at--;

		const endlinetpos=line2tpos[at+1];
		while (at>0&&line2tpos[at-1]==line2tpos[at]) { //empty line has same tpos, backward to last line
			at--;
		}
		if (at<0) continue;

		line2tpos_at.push([line2tpos,at]);
		var kpos=absline2kPos(bookof[i],at,C,R);
		if (linetext) { //given texts, calculate accurate char offset
			const tchar=tposs[i]- line2tpos[at];
			const line=((linetext instanceof Array)?getLine(tposs[i],line2tpos):linetext ) ||"";
			kpos+=calKCharOffset.call(this,tchar, line, removePunc);
		}
		kposs.push(kpos);
		linetpos.push([line2tpos[at],endlinetpos]);
	}
	var out = {kpos:kposs,linetpos:linetpos};

	if (extraline) { //show extra lines above and under hit line
		var linekrange=[];
		if (extraline>2) linetpos=[]; //reset , get from nextline/prevline
		for (var i=0;i<kposs.length;i++) {
			var startlinekpos=kposs[i] , endlinekpos=startlinekpos;
			const line2tpos=line2tpos_at[i][0], at=line2tpos_at[i][1];
			if (extraline>2) {
				const adv=Math.floor((extraline-1)/2);
				if (adv>2) adv=2;
				const s=prevline.call(this,startlinekpos,line2tpos,at,adv );
				const e=nextline.call(this,startlinekpos,line2tpos,at,adv );
				startlinekpos=s.kpos;
				endlinekpos=e.kpos;
				var ltposs=[];
				for (var j=s.at;j<=e.at;j++) {
					if (j>s.at&&line2tpos[j]==line2tpos[j-1]) continue;
					ltposs.push(line2tpos[j]);
				}
				ltposs.push(line2tpos[e.at+1]-1); //for triming posting list
				linetpos.push(ltposs);
			}
			const end=endlinekpos+this.addressPattern.maxchar-1;
			const r=this.makeKRange(startlinekpos,end);
			linekrange.push(r);
		}
		out = {kpos:kposs,linekrange:linekrange,line:extraline,linetpos:linetpos};
	}

	return out;
}
const kPos2TPos=function(kposs,bookline2tpos){
	var out=[];
	for (var i=0;i<kposs;i++) {
		const r=Ksanapos.unpack(kpos,this.addressPattern);
		const line2tpos=bookline2tpos[r[0]];
		const absline=r[1]*this.addressPattern.maxline+r[2];
		out.push( line2tpos[absline]);
	}
	return out;
}
const toTPos=function(kpos,cb){
	if (!(kpos instanceof Array)){
		kpos=[kpos];
	}
	
	var keys=[],bookid=[],books={};
	for (var i=0;i<kpos.length;i++) {
		const r=Ksanapos.unpack(kpos,this.addressPattern);
		const bk=r[0];
		bookof.push(r[0]);
		books[bk]=true;
	}
	for (bk in books) {
		keys.push(["inverted","line2tpos",bk]);
		bookid.push(bk);
	}
	var bookline2tpos={};
	if (!cb) { //sync version
		const line2tposs=this.get(keys);//already in cache
		if (!line2tposs) {
			console.error("async get fail , kpos",kpos,"keys",keys);
			return null;
		}
		for (var i=0;i<line2tposs.length;i++) {
			bookline2tpos[bookid[i]] =line2tposs[i];
		}
		return kPos2TPos.call(this,kpos,bookline2tpos);
	} else {
		this.get(keys,function(line2tposs){
			for (var i=0;i<line2tposs.length;i++) {
			  bookline2tpos[bookid[i]] =line2tposs[i];
			}
			cb&&cb(kPos2TPos.call(this,kpos,bookline2tpos));
		}.bind(this));
	}
}
const fromTPos=function(tpos,opts,cb){
	var arr=tpos;
	if (typeof opts=="function") {
		cb=opts;
		opts={};
	}
	opts=opts||{};

	if (typeof tpos=="number") arr=[tpos];
	if (!arr.length) {
		cb&&cb();
		return {kpos:[]};
	}
	const book2tpos=this.get(["inverted","book2tpos"]);
	var bookline2tpos={},bookof=[];
	//get line2tpos of each book                                                                                            
	var keys=[],bookid=[],books={};
	for (var i=0;i<arr.length;i++) {
		var bk=bsearch(book2tpos,arr[i],true);
		bookof.push(bk);
		books[bk]=true;
	}
	for (var bk in books) {
		keys.push(["inverted","line2tpos",bk]);
		bookid.push(bk);
	}
	if (!cb) { //sync version
		const line2tposs=this.get(keys);//already in cache
		if (!line2tposs || !line2tposs[0]) {
			//console.error("async get fail , tpos",tpos,"keys",keys);
			return {kpos:[]};
		}
		for (var i=0;i<line2tposs.length;i++) {
			bookline2tpos[bookid[i]] =line2tposs[i];
		}
		return tPos2KPos.call(this,arr,opts.line,opts.linetext,opts.linetpos,bookline2tpos,bookof);
	} else {
		this.get(keys,function(line2tposs){
			for (var i=0;i<line2tposs.length;i++) {
			  bookline2tpos[bookid[i]] =line2tposs[i];
			}
			cb&&cb(tPos2KPos.call(this,arr,opts.line,opts.linetext,opts.linetpos,bookline2tpos,bookof));
		}.bind(this));
	}
}
const tPosToKRange=function(tpos,opts,cb){
	var kranges=[];
	if (typeof opts=="function") {
		cb=opts;
		opts={};
	}

	const res=fromTPos.call(this,tpos,opts,function(kposs){
		cb&&cb(kranges);
	}.bind(this));

	if (!cb) return res;
}
/* see ksana-corpus-build putToken how tPos++*/
const twidth=function(type,removePunc){ //return tpos advancement by token type
	if (type===TT.SPACE || (type===TT.PUNC && removePunc)) {
		return 0;
	}
	return 1;
}
module.exports={fromTPos:fromTPos,tPosToKRange:tPosToKRange,toTPos:toTPos}
},{"./bsearch":17,"./ksanapos":27,"./tokentypes":33}],35:[function(require,module,exports){

/* emulate filesystem on html5 browser */
/* emulate filesystem on html5 browser */

var getFileSize=function(fn,cb) {
	var reader = new FileReader();
	reader.onload = function(){
		cb(reader.result.length);
	};
	reader.readAsDataURL(fn);
}
var xhr_getFileSize=function(url,cb){
  var http = new XMLHttpRequest();
  http.open('HEAD', url+"?"+(new Date().getTime()) ,true);
  http.onload=function(e){
		var length=parseInt(http.getResponseHeader("Content-Length"));
		setTimeout(function(){
			if (this.status>200) {
	 			cb(1,"invalid url");
			} else {
				cb(0,length);
			}
		}.bind(this),0);
  }
  http.send();
}


var close=function(handle) {}
var fstatSync=function(handle) {
	throw "not implement yet";
}
var fstat=function(handle,cb) {
	throw "not implement yet";
}
var _openLocal=function(file,cb) {
	var handle={};
	handle.url=URL.createObjectURL(file);
	handle.fn=file.name.substr(file.name.indexOf("#")+1);
	handle.file=file;
	cb(handle);
}
var _openXHR=function(file,cb) {
	var handle={};
	handle.url=file;
	handle.fn=file.substr(file.lastIndexOf("/")+1);
	cb(handle);
}

var _open=function(fn_url,cb) {
		var handle={};
		if (fn_url.indexOf("filesystem:")==0){
			handle.url=fn_url;
			handle.fn=fn_url.substr( fn_url.lastIndexOf("/")+1);
		} else {
			handle.fn=fn_url;
			var url=API.files.filter(function(f){ return (f[0]==fn_url)});
			if (url.length) handle.url=url[0][1];
			else cb(null);
		}
		cb(handle);
}
var open=function(fn_url,cb) {
	if (typeof File !=="undefined" && fn_url.constructor ===File) {
		_openLocal.call(this,fn_url,cb);
		return;
	}

	if (fn_url.indexOf("http")>-1){//
		_openXHR.call(this,fn_url,cb);
		return;
	}

	if (!API.initialized) {init(1024*1024,function(bytes,fs){
		if (!fs) {
			cb(null);//cannot open , htmlfs is not available
			return;
		}
		_open.apply(this,[fn_url,cb]);
	},this)} else _open.apply(this,[fn_url,cb]);
}
var load=function(filename,mode,cb) {
	open(filename,mode,cb,true);
}
function errorHandler(e) {
	console.error('Error: ' +e.name+ " "+e.message);
}
var readdir=function(cb,context) {
	 var dirReader = API.fs.root.createReader();
	 var out=[],that=this;
		dirReader.readEntries(function(entries) {
			if (entries.length) {
				for (var i = 0, entry; entry = entries[i]; ++i) {
					if (entry.isFile) {
						out.push([entry.name,entry.toURL ? entry.toURL() : entry.toURI()]);
					}
				}
			}
			API.files=out;
			if (cb) cb.apply(context,[out]);
		}, function(){
			if (cb) cb.apply(context,[null]);
		});
}
var initfs=function(grantedBytes,cb,context) {
	webkitRequestFileSystem(PERSISTENT, grantedBytes,  function(fs) {
		API.fs=fs;
		API.quota=grantedBytes;
		readdir(function(){
			API.initialized=true;
			cb.apply(context,[grantedBytes,fs]);
		},context);
	}, errorHandler);
}
var init=function(quota,cb,context) {
	if (!navigator.webkitPersistentStorage) {
		cb.apply(context,[0,null]);
		return;
	}
	navigator.webkitPersistentStorage.requestQuota(quota, 
			function(grantedBytes) {
				initfs(grantedBytes,cb,context);
		}, errorHandler 
	);
}

var read=require("./xhr_read").read;
var xhr_read=require("./xhr_read").xhr_read;
var API={
	read:read
	,readdir:readdir
	,open:open
	,close:close
	,fstatSync:fstatSync
	,fstat:fstat
	,getFileSize:getFileSize
	,xhr_read:xhr_read
	,xhr_getFileSize:xhr_getFileSize
}
module.exports=API;
},{"./xhr_read":42}],36:[function(require,module,exports){
module.exports={
	open:require("./kdb")
}

},{"./kdb":37}],37:[function(require,module,exports){
/*
	KDB version 3.0 GPL
	yapcheahshen@gmail.com
	2013/12/28
	asyncronize version of yadb

  remove dependency of Q, thanks to
  http://stackoverflow.com/questions/4234619/how-to-avoid-long-nesting-of-asynchronous-functions-in-node-js

  2015/1/2
  moved to ksanaforge/ksana-jsonrom
  add err in callback for node.js compliant
*/
var Kfs=null;

if (typeof ksanagap=="undefined") {
	try {
		var react_native=require("react-native");
		var OS=react_native.Platform.OS;
		if (OS=='android') {
			Kfs=require("./kdbfs_rn_android");
		} else {
			Kfs=require("./kdbfs_ios");
		}
	} catch(e) {
		Kfs=require('./kdbfs');	
	}			
} else {
	if (ksanagap.platform=="ios") {
		Kfs=require("./kdbfs_ios");
	} else if (ksanagap.platform=="node-webkit") {
		Kfs=require("./kdbfs");
	} else if (ksanagap.platform=="chrome") {
		Kfs=require("./kdbfs");
	} else {
		Kfs=require("./kdbfs_android");
	}
		
}


var DT={
	uint8:'1', //unsigned 1 byte integer
	int32:'4', // signed 4 bytes integer
	utf8:'8',  
	ucs2:'2',
	bool:'^', 
	blob:'&',
	utf8arr:'*', //shift of 8
	ucs2arr:'@', //shift of 2
	uint8arr:'!', //shift of 1
	int32arr:'$', //shift of 4
	vint:'`',
	pint:'~',	

	array:'\u001b',
	object:'\u001a' 
	//ydb start with object signature,
	//type a ydb in command prompt shows nothing
}
var verbose=0, read32=function(){};
var _readLog=function(readtype,bytes) {
	console.log(readtype,bytes,"bytes");
}
if (verbose) readLog=_readLog;
var strsep="\uffff";
var Create=function(path,opts,cb) {
	/* loadxxx functions move file pointer */
	// load variable length int
	if (typeof opts=="function") {
		cb=opts;
		opts={};
	}

	
	var loadVInt =function(opts,blocksize,count,cb) {
		//if (count==0) return [];
		var that=this;

		this.fs.readBuf_packedint(opts.cur,blocksize,count,true,function(o){
			//console.log("vint");
			opts.cur+=o.adv;
			cb.apply(that,[o.data]);
		});
	}
	var loadVInt1=function(opts,cb) {
		var that=this;
		loadVInt.apply(this,[opts,6,1,function(data){
			//console.log("vint1");
			cb.apply(that,[data[0]]);
		}])
	}
	//for postings
	var loadPInt =function(opts,blocksize,count,cb) {
		var that=this;
		this.fs.readBuf_packedint(opts.cur,blocksize,count,false,function(o){
			//console.log("pint");
			opts.cur+=o.adv;
			cb.apply(that,[o.data]);
		});
	}
	// item can be any type (variable length)
	// maximum size of array is 1TB 2^40
	// structure:
	// signature,5 bytes offset, payload, itemlengths
	var getArrayLength=function(opts,cb) {
		var that=this;
		var dataoffset=0;

		this.fs.readUI8(opts.cur,function(len){
			var lengthoffset=len*4294967296;
			opts.cur++;
			that.fs.readUI32(opts.cur,function(len){
				opts.cur+=4;
				dataoffset=opts.cur; //keep this
				lengthoffset+=len;
				opts.cur+=lengthoffset;

				loadVInt1.apply(that,[opts,function(count){
					loadVInt.apply(that,[opts,count*6,count,function(sz){						
						cb({count:count,sz:sz,offset:dataoffset});
					}]);
				}]);
				
			});
		});
	}

	var loadArray = function(opts,blocksize,cb) {
		var that=this;
		getArrayLength.apply(this,[opts,function(L){
				var o=[];
				var endcur=opts.cur;
				opts.cur=L.offset;

				if (opts.lazy) { 
						var offset=L.offset;
						for (var i=0;i<L.sz.length;i++) {
							var sz=L.sz[i];
							o[o.length]=strsep+offset.toString(16)
								   +strsep+sz.toString(16);
							offset+=sz;
						};
				} else {
					var taskqueue=[];
					for (var i=0;i<L.count;i++) {
						taskqueue.push(
							(function(sz){
								return (
									function(data){
										if (typeof data=='object' && data.__empty) {
											 //not pushing the first call
										}	else o.push(data);
										opts.blocksize=sz;
										load.apply(that,[opts, taskqueue.shift()]);
									}
								);
							})(L.sz[i])
						);
					}
					//last call to child load
					taskqueue.push(function(data){
						o.push(data);
						opts.cur=endcur;
						cb.apply(that,[o]);
					});
				}

				if (opts.lazy) cb.apply(that,[o]);
				else {
					taskqueue.shift()({__empty:true});
				}
			}
		])
	}		
	// item can be any type (variable length)
	// support lazy load
	// structure:
	// signature,5 bytes offset, payload, itemlengths, 
	//                    stringarray_signature, keys
	var loadObject = function(opts,blocksize,cb) {
		var that=this;
		var start=opts.cur;
		getArrayLength.apply(this,[opts,function(L) {
			opts.blocksize=blocksize-opts.cur+start;
			load.apply(that,[opts,function(keys){ //load the keys
				if (opts.keys) { //caller ask for keys
					keys.map(function(k) { opts.keys.push(k)});
				}

				var o={};
				var endcur=opts.cur;
				opts.cur=L.offset;
				if (opts.lazy) { 
					var offset=L.offset;
					for (var i=0;i<L.sz.length;i++) {
						//prefix with a \0, impossible for normal string
						o[keys[i]]=strsep+offset.toString(16)
							   +strsep+L.sz[i].toString(16);
						offset+=L.sz[i];
					}
				} else {
					var taskqueue=[];
					for (var i=0;i<L.count;i++) {
						taskqueue.push(
							(function(sz,key){
								return (
									function(data){
										if (typeof data=='object' && data.__empty) {
											//not saving the first call;
										} else {
											o[key]=data; 
										}
										opts.blocksize=sz;
										if (verbose) readLog("key",key);
										load.apply(that,[opts, taskqueue.shift()]);
									}
								);
							})(L.sz[i],keys[i-1])

						);
					}
					//last call to child load
					taskqueue.push(function(data){
						o[keys[keys.length-1]]=data;
						opts.cur=endcur;
						cb.apply(that,[o]);
					});
				}
				if (opts.lazy) cb.apply(that,[o]);
				else {
					taskqueue.shift()({__empty:true});
				}
			}]);
		}]);
	}

	//item is same known type
	var loadStringArray=function(opts,blocksize,encoding,cb) {
		var that=this;
		this.fs.readStringArray(opts.cur,blocksize,encoding,function(o){
			opts.cur+=blocksize;
			cb.apply(that,[o]);
		});
	}
	var loadIntegerArray=function(opts,blocksize,unitsize,cb) {
		var that=this;
		loadVInt1.apply(this,[opts,function(count){
			var o=that.fs.readFixedArray(opts.cur,count,unitsize,function(o){
				opts.cur+=count*unitsize;
				cb.apply(that,[o]);
			});
		}]);
	}
	var loadBlob=function(blocksize,cb) {
		var o=this.fs.readBuf(this.cur,blocksize);
		this.cur+=blocksize;
		return o;
	}	
	var loadbysignature=function(opts,signature,cb) {
		  var blocksize=opts.blocksize||this.fs.size; 
			opts.cur+=this.fs.signature_size;
			var datasize=blocksize-this.fs.signature_size;
			//basic types
			if (signature===DT.int32) {
				opts.cur+=4;
				this.fs.readI32(opts.cur-4,cb);
			} else if (signature===DT.uint8) {
				opts.cur++;
				this.fs.readUI8(opts.cur-1,cb);
			} else if (signature===DT.utf8) {
				var c=opts.cur;opts.cur+=datasize;
				this.fs.readString(c,datasize,'utf8',cb);
			} else if (signature===DT.ucs2) {
				var c=opts.cur;opts.cur+=datasize;
				this.fs.readString(c,datasize,'ucs2',cb);	
			} else if (signature===DT.bool) {
				opts.cur++;
				this.fs.readUI8(opts.cur-1,function(data){cb(!!data)});
			} else if (signature===DT.blob) {
				loadBlob(datasize,cb);
			}
			//variable length integers
			else if (signature===DT.vint) {
				loadVInt.apply(this,[opts,datasize,datasize,cb]);
			}
			else if (signature===DT.pint) {
				loadPInt.apply(this,[opts,datasize,datasize,cb]);
			}
			//simple array
			else if (signature===DT.utf8arr) {
				loadStringArray.apply(this,[opts,datasize,'utf8',cb]);
			}
			else if (signature===DT.ucs2arr) {
				loadStringArray.apply(this,[opts,datasize,'ucs2',cb]);
			}
			else if (signature===DT.uint8arr) {
				loadIntegerArray.apply(this,[opts,datasize,1,cb]);
			}
			else if (signature===DT.int32arr) {
				loadIntegerArray.apply(this,[opts,datasize,4,cb]);
			}
			//nested structure
			else if (signature===DT.array) {
				loadArray.apply(this,[opts,datasize,cb]);
			}
			else if (signature===DT.object) {
				loadObject.apply(this,[opts,datasize,cb]);
			}
			else {
				console.error('unsupported type',signature,opts)
				cb.apply(this,[null]);//make sure it return
				//throw 'unsupported type '+signature;
			}
	}

	var load=function(opts,cb) {
		opts=opts||{}; // this will served as context for entire load procedure
		opts.cur=opts.cur||0;
		var that=this;
		this.fs.readSignature(opts.cur, function(signature){
			loadbysignature.apply(that,[opts,signature,cb])
		});
		return this;
	}
	var CACHE=null;
	var KEY={};
	var ADDRESS={};
	var reset=function(cb) {
		if (!CACHE) {
			load.apply(this,[{cur:0,lazy:true},function(data){
				CACHE=data;
				cb.call(this);
			}]);	
		} else {
			cb.call(this);
		}
	}

	var exists=function(path,cb) {
		if (path.length==0) return true;
		var key=path.pop();
		var that=this;
		get.apply(this,[path,false,function(data){
			if (!path.join(strsep)) return (!!KEY[key]);
			var keys=KEY[path.join(strsep)];
			path.push(key);//put it back
			if (keys) cb.apply(that,[keys.indexOf(key)>-1]);
			else cb.apply(that,[false]);
		}]);
	}

	var getSync=function(path) {
		if (!CACHE) return undefined;	
		var o=CACHE;
		for (var i=0;i<path.length;i++) {
			if (typeof o!=="object") return null; //cannot dig in
			var r=o[path[i]];
			if (typeof r=="undefined") return null;
			o=r;
		}
		return o;
	}
	var get=function(path,opts,cb,context) {
		if (typeof path=='undefined') path=[];
		if (typeof path=="string") path=[path];
		//opts.recursive=!!opts.recursive;
		if (typeof opts=="function") {
			context=cb;
			cb=opts;
			opts={};
		}
		opts=opts||{};
		var context=context||this;
		var that=this;

		//if (typeof cb!='function') return getSync(path);
		const cached=getSync(path);
		if ((cached!==null && typeof cached!=="undefined") || typeof cb!='function' ) {
			if ((typeof cached=="string" && cached[0]!==strsep)
				||typeof cached!=="string") {
				//not calling cb if syncable 
				!opts.syncable&&cb&&cb.call(context,cached);
				//sync read
				return cached;
			}
		}

		reset.apply(this,[function(){
			var o=CACHE;
			if (path.length==0) {
				if (opts.address) {
					cb.apply(context,[[0,that.fs.size]]);
				} else {
					cb.apply(context,[Object.keys(CACHE)]);
				}
				return;
			} 
			
			var pathnow="",taskqueue=[],newopts={},r=null;
			var lastkey="";

			for (var i=0;i<path.length;i++) {
				var task=(function(key,k){

					return (function(data){
						if (!(typeof data=='object' && data.__empty)) {
							if (typeof o[lastkey]=='string' && o[lastkey][0]==strsep) o[lastkey]={};
							o[lastkey]=data; 
							o=o[lastkey];
							r=data[key];
							KEY[pathnow]=opts.keys;								
						} else {
							data=o[key];
							r=data;
						}

						if (typeof r==="undefined") {
							taskqueue=null;
							cb.apply(context,[r]); //return empty value
						} else {							
							if (parseInt(k)) pathnow+=strsep;
							pathnow+=key;
							if (typeof r=='string' && r[0]==strsep) { //offset of data to be loaded
								var p=r.substring(1).split(strsep).map(function(item){return parseInt(item,16)});
								var cur=p[0],sz=p[1];
								newopts.lazy=!opts.recursive || (k<path.length-1) ;
								newopts.blocksize=sz;newopts.cur=cur,newopts.keys=[];
								lastkey=key; //load is sync in android
								if (opts.address && taskqueue.length==1) {
									ADDRESS[pathnow]=[cur,sz];
									taskqueue.shift()(null,ADDRESS[pathnow]);
								} else {
									load.apply(that,[newopts, taskqueue.shift()]);
								}
							} else {
								if (opts.address && taskqueue.length==1) {
									taskqueue.shift()(null,ADDRESS[pathnow]);
								} else {
									taskqueue.shift().apply(that,[r]);
								}
							}
						}
					})
				})
				(path[i],i);
				
				taskqueue.push(task);
			}

			if (taskqueue.length==0) {
				cb.apply(context,[o]);
			} else {
				//last call to child load
				taskqueue.push(function(data,cursz){
					if (opts.address) {
						cb.apply(context,[cursz]);
					} else{
						var key=path[path.length-1];
						o[key]=data; KEY[pathnow]=opts.keys;
						cb && cb.apply(context,[data]);
					}
				});
				taskqueue.shift()({__empty:true});			
			}

		}]); //reset
	}
	// get all keys in given path
	var getkeys=function(path,cb) {
		if (!path) path=[]
		var that=this;

		get.apply(this,[path,false,function(){
			if (path && path.length) {
				cb.apply(that,[KEY[path.join(strsep)]]);
			} else {
				cb.apply(that,[Object.keys(CACHE)]); 
				//top level, normally it is very small
			}
		}]);
	}

	var setupapi=function() {
		this.load=load;
//		this.cur=0;
		this.cache=function() {return CACHE};
		this.key=function() {return KEY};
		this.free=function() {
			CACHE=null;
			KEY=null;
			this.fs.free();
		}
		this.setCache=function(c) {CACHE=c};
		this.keys=getkeys;
		this.get=get;   // get a field, load if needed
		this.exists=exists;
		this.DT=DT;
		
		//install the sync version for node
		//if (typeof process!="undefined") require("./kdb_sync")(this);
		//if (cb) setTimeout(cb.bind(this),0);
		var that=this;
		var err=0;
		if (cb) {
			setTimeout(function(){
				cb(err,that);	
			},0);
		}
	}
	var that=this;
	var kfs=new Kfs(path,opts,function(err){
		if (err) {
			setTimeout(function(){
				cb(err,0);
			},0);
			return null;
		} else {
			that.size=this.size;
			setupapi.call(that);			
		}
	});
	this.fs=kfs;
	return this;
}

Create.datatypes=DT;

if (module) module.exports=Create;
//return Create;

},{"./kdbfs":38,"./kdbfs_android":39,"./kdbfs_ios":40,"./kdbfs_rn_android":41,"react-native":undefined}],38:[function(require,module,exports){
/* node.js and html5 file system abstraction layer*/
var fs,Buffer,html5fs;
const html5mode=function(){
	fs=require('./html5read');
	Buffer=function(){ return ""};
	html5fs=true; 	
}
try {
	fs=require("fs");
	Buffer=require("buffer").Buffer;
} catch (e) {
	html5mode();
}

if (!fs.existsSync) {
	html5mode();
}

var signature_size=1;
var verbose=0, readLog=function(){};
var _readLog=function(readtype,bytes) {
	console.log(readtype,bytes);
}
if (verbose) readLog=_readLog;

var unpack_int = function (ar, count , reset) {
   count=count||ar.length;
  var r = []
  //var r=new Uint32Array(count);
  var i = 0, v = 0,n=0;
  do {
	var mul=1; //var shift = 0;

		do {
		  //v += ((ar[i] & 0x7F) << shift);
		  //shift += 7;	  
		//} while (ar[++i] & 0x80);

			v  = v + (ar[i] % 0x80) * mul;
			mul = mul * 128;
		} while (ar[++i] % 0x100 >= 0x80);
		r.push(v);


	//r[n++]=v;
		if (reset) v=0;
		count--;
  } while (i<ar.length && count);

  //var rr=r.subarray(0,n);
  return {data:r, adv:i };
}
var Open=function(path,opts,cb) {
	opts=opts||{};

	var readSignature=function(pos,cb) {
		var buf=new Buffer(signature_size);
		var that=this;
		this.read(this.handle,buf,0,signature_size,pos,function(err,len,buffer){
			if (html5fs) var signature=String.fromCharCode((new Uint8Array(buffer))[0])
			else var signature=buffer.toString('utf8',0,signature_size);
			readLog("signature",signature.charCodeAt(0));
			cb.apply(that,[signature]);
		});
	}

	//this is quite slow
	//wait for StringView +ArrayBuffer to solve the problem
	//https://groups.google.com/a/chromium.org/forum/#!topic/blink-dev/ylgiNY_ZSV0
	//if the string is always ucs2
	//can use Uint16 to read it.
	//http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String

	var decodeutf8 = function (utftext) {
		var string = "";
		var i = 0;
		var c=0,c1 = 0, c2 = 0 , c3=0;
		for (var i=0;i<utftext.length;i++) {
			if (utftext.charCodeAt(i)>127) break;
		}
		if (i>=utftext.length) return utftext;

		while ( i < utftext.length ) {
			c = utftext.charCodeAt(i);
			if (c < 128) {
				string += utftext[i];
				i++;
			} else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			} else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
		}
		return string;
	}

	var decodeule16buffer=function(buf) {
		if (typeof TextDecoder!=="undefined") {
			var decoder=new TextDecoder("utf-16le");
			return decoder.decode(buf)
		} else {
			return String.fromCharCode.apply(null, new Uint16Array(buffer));
		}
	}
	var readString= function(pos,blocksize,encoding,cb) {
		encoding=encoding||'utf8';
		var buffer=new Buffer(blocksize);
		var that=this;
		this.read(this.handle,buffer,0,blocksize,pos,function(err,len,buffer){
			readLog("string",len);
			if (html5fs) {
				if (encoding=='utf8') {
					var str=decodeutf8(String.fromCharCode.apply(null, new Uint8Array(buffer)))
				} else { //ucs2 is 3 times faster
					var str=decodeule16buffer(buffer);
				}
				cb.apply(that,[str]);
			} 
			else cb.apply(that,[buffer.toString(encoding)]);	
		});
	}

	//work around for chrome fromCharCode cannot accept huge zarray
	//https://code.google.com/p/chromium/issues/detail?id=56588
	var buf2stringarr=function(buf,enc) {
		if (typeof TextDecoder!=="undefined") {
			//TextDecoder is two times faster
			if (enc==="ucs2") enc="utf-16le";
			var decoder=new TextDecoder(enc);
			return decoder.decode(buf).split("\0");
		} else{
			if (enc=="utf8") 	var arr=new Uint8Array(buf);
			else var arr=new Uint16Array(buf);
			var i=0,codes=[],out=[],s="";
			while (i<arr.length) {
				if (arr[i]) {
					codes[codes.length]=arr[i];
				} else {
					s=String.fromCharCode.apply(null,codes);
					if (enc=="utf8") out[out.length]=decodeutf8(s);
					else out[out.length]=s;
					codes=[];				
				}
				i++;
			}
			
			s=String.fromCharCode.apply(null,codes);
			if (enc=="utf8") out[out.length]=decodeutf8(s);
			else out[out.length]=s;

			return out;			
		}
	}
	var readStringArray = function(pos,blocksize,encoding,cb) {
		var that=this,out=null;
		if (blocksize==0) return [];
		encoding=encoding||'utf8';
		var buffer=new Buffer(blocksize);

		//if (blocksize>1000000) console.time("readstringarray");
		this.read(this.handle,buffer,0,blocksize,pos,function(err,len,buffer){
			if (html5fs) {
				readLog("stringArray",buffer.byteLength);

				if (encoding=='utf8') {
					out=buf2stringarr(buffer,"utf8");
				} else { //ucs2 is 3 times faster
					out=buf2stringarr(buffer,"ucs2");
				}
			} else {
				readLog("stringArray",buffer.length);
				out=buffer.toString(encoding).split('\0');
			}
			//if (blocksize>1000000) console.timeEnd("readstringarray");
			cb.apply(that,[out]);
		});
	}
	var readUI32=function(pos,cb) {
		var buffer=new Buffer(4);
		var that=this;
		this.read(this.handle,buffer,0,4,pos,function(err,len,buffer){			
			if (html5fs){
				//v=(new Uint32Array(buffer))[0];
				var v=new DataView(buffer).getUint32(0, false)
				readLog("ui32",v);
				cb(v);
			}
			else cb.apply(that,[buffer.readInt32BE(0)]);	
		});		
	}

	var readI32=function(pos,cb) {
		var buffer=new Buffer(4);
		var that=this;
		this.read(this.handle,buffer,0,4,pos,function(err,len,buffer){
			
			if (html5fs){
				var v=new DataView(buffer).getInt32(0, false)
				readLog("i32",v);
				cb(v);
			}
			else  	cb.apply(that,[buffer.readInt32BE(0)]);	
		});
	}
	var readUI8=function(pos,cb) {
		var buffer=new Buffer(1);
		var that=this;

		this.read(this.handle,buffer,0,1,pos,function(err,len,buffer){
			
			if (html5fs){
				var v=(new Uint8Array(buffer))[0];
				readLog("ui8",v);
				cb(v) ;
			}
			else  			cb.apply(that,[buffer.readUInt8(0)]);	
			
		});
	}
	var readBuf=function(pos,blocksize,cb) {
		var that=this;
		var buf=new Buffer(blocksize);
		this.read(this.handle,buf,0,blocksize,pos,function(err,len,buffer){
			readLog("buf pos "+pos+' len '+len+' blocksize '+blocksize);
			var buff=new Uint8Array(buffer)
			cb.apply(that,[buff]);
		});
	}
	var readBuf_packedint=function(pos,blocksize,count,reset,cb) {
		var that=this;
		readBuf.apply(this,[pos,blocksize,function(buffer){
			cb.apply(that,[unpack_int(buffer,count,reset)]);	
		}]);
		
	}
	var readFixedArray_html5fs=function(pos,count,unitsize,cb) {
		var func=null;
		if (unitsize===1) {
			func='getUint8';//Uint8Array;
		} else if (unitsize===2) {
			func='getUint16';//Uint16Array;
		} else if (unitsize===4) {
			func='getUint32';//Uint32Array;
		} else throw 'unsupported integer size';

		this.read(this.handle,null,0,unitsize*count,pos,function(err,len,buffer){
			readLog("fix array",len);
			var out=[];
			if (unitsize==1) {
				out=new Uint8Array(buffer);
			} else {
				for (var i = 0; i < len / unitsize; i++) { //endian problem
				//	out.push( func(buffer,i*unitsize));
					out.push( v=new DataView(buffer)[func](i,false) );
				}
			}

			cb.apply(that,[out]);
		});
	}
	// signature, itemcount, payload
	var readFixedArray = function(pos ,count, unitsize,cb) {
		var func=null;
		var that=this;
		
		if (unitsize* count>this.size && this.size)  {
			console.log("array size exceed file size",this.size)
			return;
		}
		
		if (html5fs) return readFixedArray_html5fs.apply(this,[pos,count,unitsize,cb]);

		var items=new Buffer( unitsize* count);
		if (unitsize===1) {
			func=items.readUInt8;
		} else if (unitsize===2) {
			func=items.readUInt16BE;
		} else if (unitsize===4) {
			func=items.readUInt32BE;
		} else throw 'unsupported integer size';
		//console.log('itemcount',itemcount,'buffer',buffer);

		this.read(this.handle,items,0,unitsize*count,pos,function(err,len,buffer){
			readLog("fix array",len);
			var out=[];
			for (var i = 0; i < items.length / unitsize; i++) {
				out.push( func.apply(items,[i*unitsize]));
			}
			cb.apply(that,[out]);
		});
	}

	var free=function() {
		//console.log('closing ',handle);
		fs.closeSync(this.handle);
	}
	var setupapi=function() {
		var that=this;
		this.readSignature=readSignature;
		this.readI32=readI32;
		this.readUI32=readUI32;
		this.readUI8=readUI8;
		this.readBuf=readBuf;
		this.readBuf_packedint=readBuf_packedint;
		this.readFixedArray=readFixedArray;
		this.readString=readString;
		this.readStringArray=readStringArray;
		this.signature_size=signature_size;
		this.free=free;
		this.read=fs.read;

		if (html5fs) {
			var fn=path;
			if (this.handle.file) {
				//local file
				fs.getFileSize(this.handle.file,function(size){
					that.size=size;
					if (cb) setTimeout(cb.bind(that),0);
				})
			} else if (fs&& fs.fs && fs.fs.root) {
				if (path.indexOf("filesystem:")==0) fn=path.substr(path.lastIndexOf("/"));
				//Google File system
				fs.fs.root.getFile(fn,{},function(entry){
				  entry.getMetadata(function(metadata) { 
					that.size=metadata.size;
					if (cb) setTimeout(cb.bind(that),0);
					});
				});				
			} else if (this.handle.url) {//use XHR
				fs.xhr_getFileSize(this.handle.url,function(err,size){
					if (err) {
						cb&&cb.call(that,"cannot open file");
					} else {
						that.size=size;
						that.read=fs.xhr_read;
						that.handle.filesize=size;//for xhr_read
						cb&& setTimeout(cb.bind(that),0);
					}
				})
			}
		} else {
			var stat=fs.fstatSync(this.handle);
			this.stat=stat;
			this.size=stat.size;		
			if (cb)	setTimeout(cb.bind(this,0),0);	
		}
	}

	var that=this;
	if (html5fs) {
		if (opts.webStorage){
			//local storage
		} else if (window && window.location.protocol.indexOf("http")>-1) {
			var slash=window.location.href.lastIndexOf("/");
			var approot=window.location.href.substr(0,slash+1);
			if (path.indexOf("/")>-1){
				approot=window.location.origin+"/";
			}
			path=approot+path;	
		}
		fs.open(path,function(h){
			if (!h) {
				cb("file not found:"+path);	
				return;
			} else {
				that.handle=h;
				that.html5fs=true;
				setupapi.call(that);
				that.opened=true;				
			}
		})
	} else {
		if (fs.existsSync && fs.existsSync(path)){
			this.handle=fs.openSync(path,'r');//,function(err,handle){
			this.opened=true;
			setupapi.call(this);
	  } else  {
			cb("file not found:"+path);	
			return null;
		}
	}
	return this;
}
module.exports=Open;
},{"./html5read":35,"buffer":undefined,"fs":undefined}],39:[function(require,module,exports){
/*
  JAVA can only return Number and String
	array and buffer return in string format
	need JSON.parse
*/
var verbose=0;

'use strict';

var readSignature=function(pos,cb) {
	if (verbose) console.debug("read signature");
	var signature=kfs.readUTF8String(this.handle,pos,1);
	if (verbose) console.debug(signature,signature.charCodeAt(0));
	cb.apply(this,[signature]);
}
var readI32=function(pos,cb) {
	if (verbose) console.debug("read i32 at "+pos);
	var i32=kfs.readInt32(this.handle,pos);
	if (verbose) console.debug(i32);
	cb.apply(this,[i32]);	
}
var readUI32=function(pos,cb) {
	if (verbose) console.debug("read ui32 at "+pos);
	var ui32=kfs.readUInt32(this.handle,pos);
	if (verbose) console.debug(ui32);
	cb.apply(this,[ui32]);
}
var readUI8=function(pos,cb) {
	if (verbose) console.debug("read ui8 at "+pos); 
	var ui8=kfs.readUInt8(this.handle,pos);
	if (verbose) console.debug(ui8);
	cb.apply(this,[ui8]);
}
var readBuf=function(pos,blocksize,cb) {
	if (verbose) console.debug("read buffer at "+pos+ " blocksize "+blocksize);
	var buf=kfs.readBuf(this.handle,pos,blocksize);
	var buff=JSON.parse(buf);
	if (verbose) console.debug("buffer length"+buff.length);
	cb.apply(this,[buff]);	
}
var readBuf_packedint=function(pos,blocksize,count,reset,cb) {
	if (verbose) console.debug("read packed int at "+pos+" blocksize "+blocksize+" count "+count);
	var buf=kfs.readBuf_packedint(this.handle,pos,blocksize,count,reset);
	var adv=parseInt(buf);
	var buff=JSON.parse(buf.substr(buf.indexOf("[")));
	if (verbose) console.debug("packedInt length "+buff.length+" first item="+buff[0]);
	cb.apply(this,[{data:buff,adv:adv}]);	
}


var readString= function(pos,blocksize,encoding,cb) {
	if (verbose) console.debug("readstring at "+pos+" blocksize " +blocksize+" enc:"+encoding);
	if (encoding=="ucs2") {
		var str=kfs.readULE16String(this.handle,pos,blocksize);
	} else {
		var str=kfs.readUTF8String(this.handle,pos,blocksize);	
	}	 
	if (verbose) console.debug(str);
	cb.apply(this,[str]);	
}

var readFixedArray = function(pos ,count, unitsize,cb) {
	if (verbose) console.debug("read fixed array at "+pos+" count "+count+" unitsize "+unitsize); 
	var buf=kfs.readFixedArray(this.handle,pos,count,unitsize);
	var buff=JSON.parse(buf);
	if (verbose) console.debug("array length"+buff.length);
	cb.apply(this,[buff]);	
}
var readStringArray = function(pos,blocksize,encoding,cb) {
	if (verbose) console.log("read String array at "+pos+" blocksize "+blocksize +" enc "+encoding); 
	encoding = encoding||"utf8";
	var buf=kfs.readStringArray(this.handle,pos,blocksize,encoding);
	//var buff=JSON.parse(buf);
	if (verbose) console.debug("read string array");
	var buff=buf.split("\uffff"); //cannot return string with 0
	if (verbose) console.debug("array length"+buff.length);
	cb.apply(this,[buff]);	
}
var mergePostings=function(positions,cb) {
	var buf=kfs.mergePostings(this.handle,JSON.stringify(positions));
	if (!buf || buf.length==0) return cb([]);
	else return cb(JSON.parse(buf));
}

var free=function() {
	//console.log('closing ',handle);
	kfs.close(this.handle);
}
var Open=function(path,opts,cb) {
	opts=opts||{};
	var signature_size=1;
	var setupapi=function() { 
		this.readSignature=readSignature;
		this.readI32=readI32;
		this.readUI32=readUI32;
		this.readUI8=readUI8;
		this.readBuf=readBuf;
		this.readBuf_packedint=readBuf_packedint;
		this.readFixedArray=readFixedArray;
		this.readString=readString;
		this.readStringArray=readStringArray;
		this.signature_size=signature_size;
		this.mergePostings=mergePostings;
		this.free=free;
		this.size=kfs.getFileSize(this.handle);
		if (verbose) console.log("filesize  "+this.size);
		if (cb)	cb.call(this);
	}

	this.handle=kfs.open(path);
	this.opened=true;
	setupapi.call(this);
	return this;
}

module.exports=Open;
},{}],40:[function(require,module,exports){
/*
  JSContext can return all Javascript types.
*/
'use strict';
var kfs = require('react-native').NativeModules.KsanaFileSystem;
var verbose=0,async=!!kfs.async;

var readSignature=function(pos,cb) {
	if (verbose)  ksanagap.log("read signature at "+pos);
	if (async) {
		var that=this;
		kfs.readUTF8String(this.handle,pos,1,function(signature){
			cb.call(that,signature);
		});
	} else {
		
		var signature=kfs.readUTF8String(this.handle,pos,1);
		if (verbose)  ksanagap.log(signature+" "+signature.charCodeAt(0));
		cb.apply(this,[signature]);
	}
}
var readI32=function(pos,cb) {
	if (async) {
		var that=this;
		kfs.readInt32(this.handle,pos,function(i32){
			cb.call(that,i32);
		});
	} else {	
		if (verbose)  ksanagap.log("read i32 at "+pos);
		var i32=kfs.readInt32(this.handle,pos);
		if (verbose)  ksanagap.log(i32);
		cb.apply(this,[i32]);	
	}
}
var readUI32=function(pos,cb) {
	if (async) {
		var that=this;
		kfs.readUInt32(this.handle,pos,function(ui32){
			cb.call(that,ui32);
		});
	} else {	
		if (verbose)  ksanagap.log("read ui32 at "+pos);
		var ui32=kfs.readUInt32(this.handle,pos);
		if (verbose)  ksanagap.log(ui32);
		cb.apply(this,[ui32]);
	}
}
var readUI8=function(pos,cb) {
	if (async) {
		var that=this;
		kfs.readUInt8(this.handle,pos,function(ui8){
			cb.call(that,ui8);
		});
	} else {
		if (verbose)  ksanagap.log("read ui8 at "+pos); 
		var ui8=kfs.readUInt8(this.handle,pos);
		if (verbose)  ksanagap.log(ui8);
		cb.apply(this,[ui8]);
	}
}
var readBuf=function(pos,blocksize,cb) {
	if (async) {
		var that=this;
		kfs.readBuf(this.handle,pos,blocksize,function(buf){
			cb.call(that,buf);
		});
	} else {

		if (verbose)  ksanagap.log("read buffer at "+pos);
		var buf=kfs.readBuf(this.handle,pos,blocksize);
		if (verbose)  ksanagap.log("buffer length"+buf.length);
		cb.apply(this,[buf]);	
	}
}
var readBuf_packedint=function(pos,blocksize,count,reset,cb) {
	if (async) {
		var that=this;
		kfs.readBuf_packedint(this.handle,pos,blocksize,count,reset,function(buf){
			if (typeof buf.data=="string") {
				buf.data=eval("["+buf.data.substr(0,buf.data.length-1)+"]");
			}			
			cb.call(that,buf);
		});
	} else {

		if (verbose)  ksanagap.log("read packed int fast, blocksize "+blocksize+" at "+pos);var t=new Date();
		var buf=kfs.readBuf_packedint(this.handle,pos,blocksize,count,reset);
		if (verbose)  ksanagap.log("return from packedint, time" + (new Date()-t));
		if (typeof buf.data=="string") {
			buf.data=eval("["+buf.data.substr(0,buf.data.length-1)+"]");
		}
		if (verbose)  ksanagap.log("unpacked length"+buf.data.length+" time" + (new Date()-t) );
		cb.apply(this,[buf]);
	}
}


var readString= function(pos,blocksize,encoding,cb) {
	if (verbose)  ksanagap.log("readstring at "+pos+" blocksize "+blocksize+" "+encoding);var t=new Date();
	if (encoding=="ucs2") {
		if (async) {
			var that=this;
			kfs.readULE16String(this.handle,pos,blocksize,function(str){
				cb.call(that,str);
			});
			return;
		} else {
			var str=kfs.readULE16String(this.handle,pos,blocksize);
		}
		
	} else {
		if (async) {
			var that=this;
			kfs.readUTF8String(this.handle,pos,blocksize,function(str){
				cb.call(that,str);
			});
			return;	
		} else {
			var str=kfs.readUTF8String(this.handle,pos,blocksize);	
		}
	}
	if (verbose)  ksanagap.log(str+" time"+(new Date()-t));
	cb.apply(this,[str]);	
}

var readFixedArray = function(pos ,count, unitsize,cb) {
	if (async) {
		var that=this;
		kfs.readFixedArray(this.handle,pos,count,unitsize,function(buf){
			cb.call(that,buf);
		});
	} else {

		if (verbose)  ksanagap.log("read fixed array at "+pos); var t=new Date();
		var buf=kfs.readFixedArray(this.handle,pos,count,unitsize);
		if (verbose)  ksanagap.log("array length "+buf.length+" time"+(new Date()-t));
		cb.apply(this,[buf]);		
	}

}
var readStringArray = function(pos,blocksize,encoding,cb) {
	//if (verbose)  ksanagap.log("read String array "+blocksize +" "+encoding); 
	encoding = encoding||"utf8";

	if (async) {
		var that=this;
		kfs.readStringArray(this.handle,pos,blocksize,encoding,function(buf){
			if (typeof buf=="string") buf=buf.split("\0");
			cb.call(that,buf);
		});
	} else {
		if (verbose)  ksanagap.log("read string array at "+pos);var t=new Date();
		var buf=kfs.readStringArray(this.handle,pos,blocksize,encoding);
		if (typeof buf=="string") buf=buf.split("\0");
		//var buff=JSON.parse(buf);
		//var buff=buf.split("\uffff"); //cannot return string with 0
		if (verbose)  ksanagap.log("string array length"+buf.length+" time"+(new Date()-t));
		cb.apply(this,[buf]);
	}
}

var mergePostings=function(positions,cb) {
	if (kfs.async) {
		kfs.mergePostings(this.handle,positions,function(buf){
			if (typeof buf=="string") {
				buf=eval("["+buf.substr(0,buf.length-1)+"]");
			}
			cb(buf);
		});
	} else {
		var buf=kfs.mergePostings(this.handle,positions,cb);
		if (typeof buf=="string") {
			buf=eval("["+buf.substr(0,buf.length-1)+"]");
		}
		cb(buf);
	}		
	
}
var free=function() {
	////if (verbose)  ksanagap.log('closing ',handle);
	kfs.close(this.handle,function(){});
}
var Open=function(path,opts,cb) {
	opts=opts||{};
	var signature_size=1;
	var setupapi=function() { 
		this.readSignature=readSignature;
		this.readI32=readI32;
		this.readUI32=readUI32;
		this.readUI8=readUI8;
		this.readBuf=readBuf;
		this.readBuf_packedint=readBuf_packedint;
		this.readFixedArray=readFixedArray;
		this.readString=readString;
		this.readStringArray=readStringArray;
		this.signature_size=signature_size;
		this.mergePostings=mergePostings;
		this.free=free;
		if (kfs.getFileSize.length==1) {
			this.size=kfs.getFileSize(this.handle);
			if (cb)	cb.call(this);	
		} else {
			var that=this;
			kfs.getFileSize(this.handle,function(size){
				that.size=size;
				if (cb)	cb.call(that);
			});
		}		
	}

	if (kfs.open.length==1) {
		this.handle=kfs.open(path);
		this.opened=true;
		setupapi.call(this);
		return this;		
	} else { //react-native
		var that=this;
		this.async=true;
		kfs.open(path,function(handle){
			if (!handle){
				cb.call(null,"File not file:"+path);
				return;
			}
			that.opened=true;
			that.handle=handle;
			setupapi.call(that);
		});
	}
}

module.exports=Open;
},{"react-native":undefined}],41:[function(require,module,exports){
/*
  binding for react native android
  JAVA can only return Number and String
	array and buffer return in string format
	need JSON.parse
*/
var kfs=require("react-native").NativeModules.KsanaFileSystem;

var verbose=0;

var readSignature=function(pos,cb) {
	if (verbose) console.debug("read signature");
	kfs.readUTF8String(this.handle,pos,1,function(signature){
		if (verbose) console.debug(signature,signature.charCodeAt(0));
		cb.apply(this,[signature]);	
	});
}
var readI32=function(pos,cb) {
	if (verbose) console.debug("read i32 at "+pos);
	kfs.readInt32(this.handle,pos,function(i32){
		if (verbose) console.debug(i32);
		cb.apply(this,[i32]);	
	});
}
var readUI32=function(pos,cb) {
	if (verbose) console.debug("read ui32 at "+pos);
	kfs.readUInt32(this.handle,pos,function(ui32){
		if (verbose) console.debug(ui32);
		cb.apply(this,[ui32]);
	});
}
var readUI8=function(pos,cb) {
	if (verbose) console.debug("read ui8 at "+pos); 
	kfs.readUInt8(this.handle,pos,function(ui8){
		if (verbose) console.debug(ui8);
		cb.apply(this,[ui8]);
	});
}
var readBuf=function(pos,blocksize,cb) {
	if (verbose) console.debug("read buffer at "+pos+ " blocksize "+blocksize);
	kfs.readBuf(this.handle,pos,blocksize,function(buff){
		//var buff=JSON.parse(buf);
		if (verbose) console.debug("buffer length"+buff.length);
		cb.apply(this,[buff]);
	});
}
var readBuf_packedint=function(pos,blocksize,count,reset,cb) {
	if (verbose) console.debug("read packed int at "+pos+" blocksize "+blocksize+" count "+count);
	kfs.readBuf_packedint(this.handle,pos,blocksize,count,reset,function(buf){
		var adv=parseInt(buf);
		var buff=JSON.parse(buf.substr(buf.indexOf("[")));
		if (verbose) console.debug("packedInt length "+buff.length+" first item="+buff[0]);
		cb.apply(this,[{data:buff,adv:adv}]);	
	});	
}


var readString= function(pos,blocksize,encoding,cb) {
	if (verbose) console.debug("readstring at "+pos+" blocksize " +blocksize+" enc:"+encoding);
	if (encoding=="ucs2") {
		var func=kfs.readULE16String;
	} else {
		var func=kfs.readUTF8String
	}	 
	func(this.handle,pos,blocksize,function(str){
		if (verbose) console.debug(str);
		cb.apply(this,[str]);	
	})
}

var readFixedArray = function(pos ,count, unitsize,cb) {
	if (verbose) console.debug("read fixed array at "+pos+" count "+count+" unitsize "+unitsize); 
	kfs.readFixedArray(this.handle,pos,count,unitsize,function(buf){
		var buff=JSON.parse(buf);
		if (verbose) console.debug("array length"+buff.length);
		cb.apply(this,[buff]);	
	});
}
var readStringArray = function(pos,blocksize,encoding,cb) {
	if (verbose) console.log("read String array at "+pos+" blocksize "+blocksize +" enc "+encoding); 
	encoding = encoding||"utf8";
	kfs.readStringArray(this.handle,pos,blocksize,encoding,function(buf){
		//var buff=JSON.parse(buf);
		if (verbose) console.debug("read string array");
		var buff=buf.split("\uffff"); //cannot return string with 0
		if (verbose) console.debug("array length"+buff.length);
		cb.apply(this,[buff]);			
	});
}
var mergePostings=function(positions,cb) {
	kfs.mergePostings(this.handle,JSON.stringify(positions),function(buf){
		if (!buf || buf.length==0) return cb([]);
		else return cb(JSON.parse(buf));
	});
}

var free=function() {
	//console.log('closing ',handle);
	kfs.close(this.handle,function(){});
}
var Open=function(path,opts,cb) {
	opts=opts||{};
	var signature_size=1;
	var setupapi=function() { 
		this.readSignature=readSignature;
		this.readI32=readI32;
		this.readUI32=readUI32;
		this.readUI8=readUI8;
		this.readBuf=readBuf;
		this.readBuf_packedint=readBuf_packedint;
		this.readFixedArray=readFixedArray;
		this.readString=readString;
		this.readStringArray=readStringArray;
		this.signature_size=signature_size;
		this.mergePostings=mergePostings;
		this.free=free;
		kfs.getFileSize(this.handle,function(size){
			this.size=size;
		}.bind(this));
		if (verbose) console.log("filesize  "+this.size);
		if (cb)	cb.call(this);
	}

	kfs.open(path,function(handle){
		if (!handle) {
		cb.call(null,"File not found:"+path);
			return;
		}
		this.handle=handle;
		this.opened=true;
		setupapi.call(this);
	}.bind(this));

	return this;
}

module.exports=Open;
},{"react-native":undefined}],42:[function(require,module,exports){
/*reduce xhr call by using cache chunk
each chunk is 32K by default.
*/

var Caches={ } //url: chunks
var chunksize=1024*64;

var inCache=function(cache,startchunk,endchunk){
	for (var i=startchunk;i<=endchunk;i++) {
		if (!cache[i]) return false;
	}
	return true;
}

var getCachedBuffer=function(cache,offset,length){
	var startchunk=Math.floor(offset/chunksize);
	var endchunk=Math.floor((offset+length)/chunksize);
	if (startchunk===endchunk) {
		var end=(offset+length)-startchunk*chunksize;
		if (end>=cache[startchunk].byteLength){
			end=cache[startchunk].byteLength;
		}
		return cache[startchunk].slice(offset-startchunk*chunksize,end);
	}

	var buffer=new Uint8Array(length);
	var now=0;
	for (var i=startchunk;i<=endchunk;i++) {
		var buf,b;
		if (i==startchunk) {
			b=new Uint8Array(cache[startchunk].slice(offset-startchunk*chunksize,cache[startchunk].byteLength));
			buffer.set(b,0);
			now=cache[startchunk].byteLength-(offset-startchunk*chunksize);
		}else if (i==endchunk) {
			var end=(offset+length)-endchunk*chunksize;
			if (end>=cache[endchunk].byteLength){
				end=cache[endchunk].byteLength;
			}
			b=new Uint8Array(cache[endchunk].slice(0,end));
			buffer.set(b,now);
		} else {
			//normally a read will not cross many chunk
			b=new Uint8Array(cache[i]);
			buffer.set(b,now);;
			now+=cache[i].byteLength;
		}
	}
	return buffer.buffer;
}

var xhr_read=function(handle,nop1,nop2,length,position,cb){
	if (!Caches[handle.url]){
		Caches[handle.url]=[];
	}
	var cache=Caches[handle.url];
	var startchunk=Math.floor(position/chunksize);
	var endchunk=Math.floor((position+length)/chunksize);

	if (inCache(cache,startchunk,endchunk)){
			var b=getCachedBuffer(cache,position,length);
			cb(0,b.byteLength,b);
		return;
	};

//TODO , optimize: not not read data already in cache

	read(handle,null,0,(endchunk-startchunk+1)*chunksize,startchunk*chunksize,
	function(err,bytes,buffer){
		for (var i=0;i<=endchunk-startchunk;i++) {
			var end=(i+1)*chunksize;
			if (end>=buffer.byteLength) end=buffer.byteLength;
			cache[i+startchunk]=buffer.slice(i*chunksize,end);
		}
		var b=getCachedBuffer(cache,position,length);
		cb(0,b.byteLength,b);
	});
}

var read=function(handle,buffer,offset,length,position,cb) {//buffer and offset is not used
	var xhr = new XMLHttpRequest();
	xhr.open('GET', handle.url+"?"+(new Date().getTime()), true);
	var range=[position,length+position-1];
	if (range[1]+1>handle.filesize) range[1]=handle.filesize-1;
	xhr.setRequestHeader('Range', 'bytes='+range[0]+'-'+range[1]);
	xhr.responseType = 'arraybuffer';
	xhr.onload = function(e) {
		var that=this;
		setTimeout(function(){
			cb(0,that.response.byteLength,that.response);
		},0);
	}; 
	xhr.send();	
}

module.exports={read:read,xhr_read:xhr_read};
},{}],43:[function(require,module,exports){
// wrapper for non-node envs
;(function (sax) {

sax.parser = function (strict, opt) { return new SAXParser(strict, opt) }
sax.SAXParser = SAXParser
sax.SAXStream = SAXStream
sax.createStream = createStream

// When we pass the MAX_BUFFER_LENGTH position, start checking for buffer overruns.
// When we check, schedule the next check for MAX_BUFFER_LENGTH - (max(buffer lengths)),
// since that's the earliest that a buffer overrun could occur.  This way, checks are
// as rare as required, but as often as necessary to ensure never crossing this bound.
// Furthermore, buffers are only tested at most once per write(), so passing a very
// large string into write() might have undesirable effects, but this is manageable by
// the caller, so it is assumed to be safe.  Thus, a call to write() may, in the extreme
// edge case, result in creating at most one complete copy of the string passed in.
// Set to Infinity to have unlimited buffers.
sax.MAX_BUFFER_LENGTH = 64 * 1024

var buffers = [
  "comment", "sgmlDecl", "textNode", "tagName", "doctype",
  "procInstName", "procInstBody", "entity", "attribName",
  "attribValue", "cdata", "script"
]

sax.EVENTS = // for discoverability.
  [ "text"
  , "processinginstruction"
  , "sgmldeclaration"
  , "doctype"
  , "comment"
  , "attribute"
  , "opentag"
  , "closetag"
  , "opencdata"
  , "cdata"
  , "closecdata"
  , "error"
  , "end"
  , "ready"
  , "script"
  , "opennamespace"
  , "closenamespace"
  ]

function SAXParser (strict, opt) {
  if (!(this instanceof SAXParser)) return new SAXParser(strict, opt)

  var parser = this
  clearBuffers(parser)
  parser.q = parser.c = ""
  parser.bufferCheckPosition = sax.MAX_BUFFER_LENGTH
  parser.opt = opt || {}
  parser.opt.lowercase = parser.opt.lowercase || parser.opt.lowercasetags
  parser.looseCase = parser.opt.lowercase ? "toLowerCase" : "toUpperCase"
  parser.tags = []
  parser.closed = parser.closedRoot = parser.sawRoot = false
  parser.tag = parser.error = null
  parser.strict = !!strict
  parser.noscript = !!(strict || parser.opt.noscript)
  parser.state = S.BEGIN
  parser.ENTITIES = Object.create(sax.ENTITIES)
  parser.attribList = []

  // namespaces form a prototype chain.
  // it always points at the current tag,
  // which protos to its parent tag.
  if (parser.opt.xmlns) parser.ns = Object.create(rootNS)

  // mostly just for error reporting
  parser.trackPosition = parser.opt.position !== false
  if (parser.trackPosition) {
    parser.position = parser.line = parser.column = 0
  }
  emit(parser, "onready")
}

if (!Object.create) Object.create = function (o) {
  function f () { this.__proto__ = o }
  f.prototype = o
  return new f
}

if (!Object.getPrototypeOf) Object.getPrototypeOf = function (o) {
  return o.__proto__
}

if (!Object.keys) Object.keys = function (o) {
  var a = []
  for (var i in o) if (o.hasOwnProperty(i)) a.push(i)
  return a
}

function checkBufferLength (parser) {
  var maxAllowed = Math.max(sax.MAX_BUFFER_LENGTH, 10)
    , maxActual = 0
  for (var i = 0, l = buffers.length; i < l; i ++) {
    var len = parser[buffers[i]].length
    if (len > maxAllowed) {
      // Text/cdata nodes can get big, and since they're buffered,
      // we can get here under normal conditions.
      // Avoid issues by emitting the text node now,
      // so at least it won't get any bigger.
      switch (buffers[i]) {
        case "textNode":
          closeText(parser)
        break

        case "cdata":
          emitNode(parser, "oncdata", parser.cdata)
          parser.cdata = ""
        break

        case "script":
          emitNode(parser, "onscript", parser.script)
          parser.script = ""
        break

        default:
          error(parser, "Max buffer length exceeded: "+buffers[i])
      }
    }
    maxActual = Math.max(maxActual, len)
  }
  // schedule the next check for the earliest possible buffer overrun.
  parser.bufferCheckPosition = (sax.MAX_BUFFER_LENGTH - maxActual)
                             + parser.position
}

function clearBuffers (parser) {
  for (var i = 0, l = buffers.length; i < l; i ++) {
    parser[buffers[i]] = ""
  }
}

function flushBuffers (parser) {
  closeText(parser)
  if (parser.cdata !== "") {
    emitNode(parser, "oncdata", parser.cdata)
    parser.cdata = ""
  }
  if (parser.script !== "") {
    emitNode(parser, "onscript", parser.script)
    parser.script = ""
  }
}

SAXParser.prototype =
  { end: function () { end(this) }
  , write: write
  , resume: function () { this.error = null; return this }
  , close: function () { return this.write(null) }
  , flush: function () { flushBuffers(this) }
  }

try {
  var Stream = require("stream").Stream
} catch (ex) {
  var Stream = function () {}
}


var streamWraps = sax.EVENTS.filter(function (ev) {
  return ev !== "error" && ev !== "end"
})

function createStream (strict, opt) {
  return new SAXStream(strict, opt)
}

function SAXStream (strict, opt) {
  if (!(this instanceof SAXStream)) return new SAXStream(strict, opt)

  Stream.apply(this)

  this._parser = new SAXParser(strict, opt)
  this.writable = true
  this.readable = true


  var me = this

  this._parser.onend = function () {
    me.emit("end")
  }

  this._parser.onerror = function (er) {
    me.emit("error", er)

    // if didn't throw, then means error was handled.
    // go ahead and clear error, so we can write again.
    me._parser.error = null
  }

  this._decoder = null;

  streamWraps.forEach(function (ev) {
    Object.defineProperty(me, "on" + ev, {
      get: function () { return me._parser["on" + ev] },
      set: function (h) {
        if (!h) {
          me.removeAllListeners(ev)
          return me._parser["on"+ev] = h
        }
        me.on(ev, h)
      },
      enumerable: true,
      configurable: false
    })
  })
}

SAXStream.prototype = Object.create(Stream.prototype,
  { constructor: { value: SAXStream } })

SAXStream.prototype.write = function (data) {
  if (typeof Buffer === 'function' &&
      typeof Buffer.isBuffer === 'function' &&
      Buffer.isBuffer(data)) {
    if (!this._decoder) {
      var SD = require('string_decoder').StringDecoder
      this._decoder = new SD('utf8')
    }
    data = this._decoder.write(data);
  }

  this._parser.write(data.toString())
  this.emit("data", data)
  return true
}

SAXStream.prototype.end = function (chunk) {
  if (chunk && chunk.length) this.write(chunk)
  this._parser.end()
  return true
}

SAXStream.prototype.on = function (ev, handler) {
  var me = this
  if (!me._parser["on"+ev] && streamWraps.indexOf(ev) !== -1) {
    me._parser["on"+ev] = function () {
      var args = arguments.length === 1 ? [arguments[0]]
               : Array.apply(null, arguments)
      args.splice(0, 0, ev)
      me.emit.apply(me, args)
    }
  }

  return Stream.prototype.on.call(me, ev, handler)
}



// character classes and tokens
var whitespace = "\r\n\t "
  // this really needs to be replaced with character classes.
  // XML allows all manner of ridiculous numbers and digits.
  , number = "0124356789"
  , letter = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  // (Letter | "_" | ":")
  , quote = "'\""
  , entity = number+letter+"#"
  , attribEnd = whitespace + ">"
  , CDATA = "[CDATA["
  , DOCTYPE = "DOCTYPE"
  , XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace"
  , XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/"
  , rootNS = { xml: XML_NAMESPACE, xmlns: XMLNS_NAMESPACE }

// turn all the string character sets into character class objects.
whitespace = charClass(whitespace)
number = charClass(number)
letter = charClass(letter)

// http://www.w3.org/TR/REC-xml/#NT-NameStartChar
// This implementation works on strings, a single character at a time
// as such, it cannot ever support astral-plane characters (10000-EFFFF)
// without a significant breaking change to either this  parser, or the
// JavaScript language.  Implementation of an emoji-capable xml parser
// is left as an exercise for the reader.
var nameStart = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/

var nameBody = /[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040\.\d-]/

quote = charClass(quote)
entity = charClass(entity)
attribEnd = charClass(attribEnd)

function charClass (str) {
  return str.split("").reduce(function (s, c) {
    s[c] = true
    return s
  }, {})
}

function isRegExp (c) {
  return Object.prototype.toString.call(c) === '[object RegExp]'
}

function is (charclass, c) {
  return isRegExp(charclass) ? !!c.match(charclass) : charclass[c]
}

function not (charclass, c) {
  return !is(charclass, c)
}

var S = 0
sax.STATE =
{ BEGIN                     : S++
, TEXT                      : S++ // general stuff
, TEXT_ENTITY               : S++ // &amp and such.
, OPEN_WAKA                 : S++ // <
, SGML_DECL                 : S++ // <!BLARG
, SGML_DECL_QUOTED          : S++ // <!BLARG foo "bar
, DOCTYPE                   : S++ // <!DOCTYPE
, DOCTYPE_QUOTED            : S++ // <!DOCTYPE "//blah
, DOCTYPE_DTD               : S++ // <!DOCTYPE "//blah" [ ...
, DOCTYPE_DTD_QUOTED        : S++ // <!DOCTYPE "//blah" [ "foo
, COMMENT_STARTING          : S++ // <!-
, COMMENT                   : S++ // <!--
, COMMENT_ENDING            : S++ // <!-- blah -
, COMMENT_ENDED             : S++ // <!-- blah --
, CDATA                     : S++ // <![CDATA[ something
, CDATA_ENDING              : S++ // ]
, CDATA_ENDING_2            : S++ // ]]
, PROC_INST                 : S++ // <?hi
, PROC_INST_BODY            : S++ // <?hi there
, PROC_INST_ENDING          : S++ // <?hi "there" ?
, OPEN_TAG                  : S++ // <strong
, OPEN_TAG_SLASH            : S++ // <strong /
, ATTRIB                    : S++ // <a
, ATTRIB_NAME               : S++ // <a foo
, ATTRIB_NAME_SAW_WHITE     : S++ // <a foo _
, ATTRIB_VALUE              : S++ // <a foo=
, ATTRIB_VALUE_QUOTED       : S++ // <a foo="bar
, ATTRIB_VALUE_CLOSED       : S++ // <a foo="bar"
, ATTRIB_VALUE_UNQUOTED     : S++ // <a foo=bar
, ATTRIB_VALUE_ENTITY_Q     : S++ // <foo bar="&quot;"
, ATTRIB_VALUE_ENTITY_U     : S++ // <foo bar=&quot;
, CLOSE_TAG                 : S++ // </a
, CLOSE_TAG_SAW_WHITE       : S++ // </a   >
, SCRIPT                    : S++ // <script> ...
, SCRIPT_ENDING             : S++ // <script> ... <
}

sax.ENTITIES =
{ "amp" : "&"
, "gt" : ">"
, "lt" : "<"
, "quot" : "\""
, "apos" : "'"
, "AElig" : 198
, "Aacute" : 193
, "Acirc" : 194
, "Agrave" : 192
, "Aring" : 197
, "Atilde" : 195
, "Auml" : 196
, "Ccedil" : 199
, "ETH" : 208
, "Eacute" : 201
, "Ecirc" : 202
, "Egrave" : 200
, "Euml" : 203
, "Iacute" : 205
, "Icirc" : 206
, "Igrave" : 204
, "Iuml" : 207
, "Ntilde" : 209
, "Oacute" : 211
, "Ocirc" : 212
, "Ograve" : 210
, "Oslash" : 216
, "Otilde" : 213
, "Ouml" : 214
, "THORN" : 222
, "Uacute" : 218
, "Ucirc" : 219
, "Ugrave" : 217
, "Uuml" : 220
, "Yacute" : 221
, "aacute" : 225
, "acirc" : 226
, "aelig" : 230
, "agrave" : 224
, "aring" : 229
, "atilde" : 227
, "auml" : 228
, "ccedil" : 231
, "eacute" : 233
, "ecirc" : 234
, "egrave" : 232
, "eth" : 240
, "euml" : 235
, "iacute" : 237
, "icirc" : 238
, "igrave" : 236
, "iuml" : 239
, "ntilde" : 241
, "oacute" : 243
, "ocirc" : 244
, "ograve" : 242
, "oslash" : 248
, "otilde" : 245
, "ouml" : 246
, "szlig" : 223
, "thorn" : 254
, "uacute" : 250
, "ucirc" : 251
, "ugrave" : 249
, "uuml" : 252
, "yacute" : 253
, "yuml" : 255
, "copy" : 169
, "reg" : 174
, "nbsp" : 160
, "iexcl" : 161
, "cent" : 162
, "pound" : 163
, "curren" : 164
, "yen" : 165
, "brvbar" : 166
, "sect" : 167
, "uml" : 168
, "ordf" : 170
, "laquo" : 171
, "not" : 172
, "shy" : 173
, "macr" : 175
, "deg" : 176
, "plusmn" : 177
, "sup1" : 185
, "sup2" : 178
, "sup3" : 179
, "acute" : 180
, "micro" : 181
, "para" : 182
, "middot" : 183
, "cedil" : 184
, "ordm" : 186
, "raquo" : 187
, "frac14" : 188
, "frac12" : 189
, "frac34" : 190
, "iquest" : 191
, "times" : 215
, "divide" : 247
, "OElig" : 338
, "oelig" : 339
, "Scaron" : 352
, "scaron" : 353
, "Yuml" : 376
, "fnof" : 402
, "circ" : 710
, "tilde" : 732
, "Alpha" : 913
, "Beta" : 914
, "Gamma" : 915
, "Delta" : 916
, "Epsilon" : 917
, "Zeta" : 918
, "Eta" : 919
, "Theta" : 920
, "Iota" : 921
, "Kappa" : 922
, "Lambda" : 923
, "Mu" : 924
, "Nu" : 925
, "Xi" : 926
, "Omicron" : 927
, "Pi" : 928
, "Rho" : 929
, "Sigma" : 931
, "Tau" : 932
, "Upsilon" : 933
, "Phi" : 934
, "Chi" : 935
, "Psi" : 936
, "Omega" : 937
, "alpha" : 945
, "beta" : 946
, "gamma" : 947
, "delta" : 948
, "epsilon" : 949
, "zeta" : 950
, "eta" : 951
, "theta" : 952
, "iota" : 953
, "kappa" : 954
, "lambda" : 955
, "mu" : 956
, "nu" : 957
, "xi" : 958
, "omicron" : 959
, "pi" : 960
, "rho" : 961
, "sigmaf" : 962
, "sigma" : 963
, "tau" : 964
, "upsilon" : 965
, "phi" : 966
, "chi" : 967
, "psi" : 968
, "omega" : 969
, "thetasym" : 977
, "upsih" : 978
, "piv" : 982
, "ensp" : 8194
, "emsp" : 8195
, "thinsp" : 8201
, "zwnj" : 8204
, "zwj" : 8205
, "lrm" : 8206
, "rlm" : 8207
, "ndash" : 8211
, "mdash" : 8212
, "lsquo" : 8216
, "rsquo" : 8217
, "sbquo" : 8218
, "ldquo" : 8220
, "rdquo" : 8221
, "bdquo" : 8222
, "dagger" : 8224
, "Dagger" : 8225
, "bull" : 8226
, "hellip" : 8230
, "permil" : 8240
, "prime" : 8242
, "Prime" : 8243
, "lsaquo" : 8249
, "rsaquo" : 8250
, "oline" : 8254
, "frasl" : 8260
, "euro" : 8364
, "image" : 8465
, "weierp" : 8472
, "real" : 8476
, "trade" : 8482
, "alefsym" : 8501
, "larr" : 8592
, "uarr" : 8593
, "rarr" : 8594
, "darr" : 8595
, "harr" : 8596
, "crarr" : 8629
, "lArr" : 8656
, "uArr" : 8657
, "rArr" : 8658
, "dArr" : 8659
, "hArr" : 8660
, "forall" : 8704
, "part" : 8706
, "exist" : 8707
, "empty" : 8709
, "nabla" : 8711
, "isin" : 8712
, "notin" : 8713
, "ni" : 8715
, "prod" : 8719
, "sum" : 8721
, "minus" : 8722
, "lowast" : 8727
, "radic" : 8730
, "prop" : 8733
, "infin" : 8734
, "ang" : 8736
, "and" : 8743
, "or" : 8744
, "cap" : 8745
, "cup" : 8746
, "int" : 8747
, "there4" : 8756
, "sim" : 8764
, "cong" : 8773
, "asymp" : 8776
, "ne" : 8800
, "equiv" : 8801
, "le" : 8804
, "ge" : 8805
, "sub" : 8834
, "sup" : 8835
, "nsub" : 8836
, "sube" : 8838
, "supe" : 8839
, "oplus" : 8853
, "otimes" : 8855
, "perp" : 8869
, "sdot" : 8901
, "lceil" : 8968
, "rceil" : 8969
, "lfloor" : 8970
, "rfloor" : 8971
, "lang" : 9001
, "rang" : 9002
, "loz" : 9674
, "spades" : 9824
, "clubs" : 9827
, "hearts" : 9829
, "diams" : 9830
}

Object.keys(sax.ENTITIES).forEach(function (key) {
    var e = sax.ENTITIES[key]
    var s = typeof e === 'number' ? String.fromCharCode(e) : e
    sax.ENTITIES[key] = s
})

for (var S in sax.STATE) sax.STATE[sax.STATE[S]] = S

// shorthand
S = sax.STATE

function emit (parser, event, data) {
  parser[event] && parser[event](data)
}

function emitNode (parser, nodeType, data) {
  if (parser.textNode) closeText(parser)
  emit(parser, nodeType, data)
}

function closeText (parser) {
  parser.textNode = textopts(parser.opt, parser.textNode)
  if (parser.textNode) emit(parser, "ontext", parser.textNode)
  parser.textNode = ""
}

function textopts (opt, text) {
  if (opt.trim) text = text.trim()
  if (opt.normalize) text = text.replace(/\s+/g, " ")
  return text
}

function error (parser, er) {
  closeText(parser)
  if (parser.trackPosition) {
    er += "\nLine: "+parser.line+
          "\nColumn: "+parser.column+
          "\nChar: "+parser.c
  }
  er = new Error(er)
  parser.error = er
  emit(parser, "onerror", er)
  return parser
}

function end (parser) {
  if (!parser.closedRoot) strictFail(parser, "Unclosed root tag")
  if ((parser.state !== S.BEGIN) && (parser.state !== S.TEXT)) error(parser, "Unexpected end")
  closeText(parser)
  parser.c = ""
  parser.closed = true
  emit(parser, "onend")
  SAXParser.call(parser, parser.strict, parser.opt)
  return parser
}

function strictFail (parser, message) {
  if (typeof parser !== 'object' || !(parser instanceof SAXParser))
    throw new Error('bad call to strictFail');
  if (parser.strict) error(parser, message)
}

function newTag (parser) {
  if (!parser.strict) parser.tagName = parser.tagName[parser.looseCase]()
  var parent = parser.tags[parser.tags.length - 1] || parser
    , tag = parser.tag = { name : parser.tagName, attributes : {} }

  // will be overridden if tag contails an xmlns="foo" or xmlns:foo="bar"
  if (parser.opt.xmlns) tag.ns = parent.ns
  parser.attribList.length = 0
}

function qname (name, attribute) {
  var i = name.indexOf(":")
    , qualName = i < 0 ? [ "", name ] : name.split(":")
    , prefix = qualName[0]
    , local = qualName[1]

  // <x "xmlns"="http://foo">
  if (attribute && name === "xmlns") {
    prefix = "xmlns"
    local = ""
  }

  return { prefix: prefix, local: local }
}

function attrib (parser) {
  if (!parser.strict) parser.attribName = parser.attribName[parser.looseCase]()

  if (parser.attribList.indexOf(parser.attribName) !== -1 ||
      parser.tag.attributes.hasOwnProperty(parser.attribName)) {
    return parser.attribName = parser.attribValue = ""
  }

  if (parser.opt.xmlns) {
    var qn = qname(parser.attribName, true)
      , prefix = qn.prefix
      , local = qn.local

    if (prefix === "xmlns") {
      // namespace binding attribute; push the binding into scope
      if (local === "xml" && parser.attribValue !== XML_NAMESPACE) {
        strictFail( parser
                  , "xml: prefix must be bound to " + XML_NAMESPACE + "\n"
                  + "Actual: " + parser.attribValue )
      } else if (local === "xmlns" && parser.attribValue !== XMLNS_NAMESPACE) {
        strictFail( parser
                  , "xmlns: prefix must be bound to " + XMLNS_NAMESPACE + "\n"
                  + "Actual: " + parser.attribValue )
      } else {
        var tag = parser.tag
          , parent = parser.tags[parser.tags.length - 1] || parser
        if (tag.ns === parent.ns) {
          tag.ns = Object.create(parent.ns)
        }
        tag.ns[local] = parser.attribValue
      }
    }

    // defer onattribute events until all attributes have been seen
    // so any new bindings can take effect; preserve attribute order
    // so deferred events can be emitted in document order
    parser.attribList.push([parser.attribName, parser.attribValue])
  } else {
    // in non-xmlns mode, we can emit the event right away
    parser.tag.attributes[parser.attribName] = parser.attribValue
    emitNode( parser
            , "onattribute"
            , { name: parser.attribName
              , value: parser.attribValue } )
  }

  parser.attribName = parser.attribValue = ""
}

function openTag (parser, selfClosing) {
  if (parser.opt.xmlns) {
    // emit namespace binding events
    var tag = parser.tag

    // add namespace info to tag
    var qn = qname(parser.tagName)
    tag.prefix = qn.prefix
    tag.local = qn.local
    tag.uri = tag.ns[qn.prefix] || ""

    if (tag.prefix && !tag.uri) {
      strictFail(parser, "Unbound namespace prefix: "
                       + JSON.stringify(parser.tagName))
      tag.uri = qn.prefix
    }

    var parent = parser.tags[parser.tags.length - 1] || parser
    if (tag.ns && parent.ns !== tag.ns) {
      Object.keys(tag.ns).forEach(function (p) {
        emitNode( parser
                , "onopennamespace"
                , { prefix: p , uri: tag.ns[p] } )
      })
    }

    // handle deferred onattribute events
    // Note: do not apply default ns to attributes:
    //   http://www.w3.org/TR/REC-xml-names/#defaulting
    for (var i = 0, l = parser.attribList.length; i < l; i ++) {
      var nv = parser.attribList[i]
      var name = nv[0]
        , value = nv[1]
        , qualName = qname(name, true)
        , prefix = qualName.prefix
        , local = qualName.local
        , uri = prefix == "" ? "" : (tag.ns[prefix] || "")
        , a = { name: name
              , value: value
              , prefix: prefix
              , local: local
              , uri: uri
              }

      // if there's any attributes with an undefined namespace,
      // then fail on them now.
      if (prefix && prefix != "xmlns" && !uri) {
        strictFail(parser, "Unbound namespace prefix: "
                         + JSON.stringify(prefix))
        a.uri = prefix
      }
      parser.tag.attributes[name] = a
      emitNode(parser, "onattribute", a)
    }
    parser.attribList.length = 0
  }

  parser.tag.isSelfClosing = !!selfClosing

  // process the tag
  parser.sawRoot = true
  parser.tags.push(parser.tag)
  emitNode(parser, "onopentag", parser.tag)
  if (!selfClosing) {
    // special case for <script> in non-strict mode.
    if (!parser.noscript && parser.tagName.toLowerCase() === "script") {
      parser.state = S.SCRIPT
    } else {
      parser.state = S.TEXT
    }
    parser.tag = null
    parser.tagName = ""
  }
  parser.attribName = parser.attribValue = ""
  parser.attribList.length = 0
}

function closeTag (parser) {
  if (!parser.tagName) {
    strictFail(parser, "Weird empty close tag.")
    parser.textNode += "</>"
    parser.state = S.TEXT
    return
  }

  if (parser.script) {
    if (parser.tagName !== "script") {
      parser.script += "</" + parser.tagName + ">"
      parser.tagName = ""
      parser.state = S.SCRIPT
      return
    }
    emitNode(parser, "onscript", parser.script)
    parser.script = ""
  }

  // first make sure that the closing tag actually exists.
  // <a><b></c></b></a> will close everything, otherwise.
  var t = parser.tags.length
  var tagName = parser.tagName
  if (!parser.strict) tagName = tagName[parser.looseCase]()
  var closeTo = tagName
  while (t --) {
    var close = parser.tags[t]
    if (close.name !== closeTo) {
      // fail the first time in strict mode
      strictFail(parser, "Unexpected close tag")
    } else break
  }

  // didn't find it.  we already failed for strict, so just abort.
  if (t < 0) {
    strictFail(parser, "Unmatched closing tag: "+parser.tagName)
    parser.textNode += "</" + parser.tagName + ">"
    parser.state = S.TEXT
    return
  }
  parser.tagName = tagName
  var s = parser.tags.length
  while (s --> t) {
    var tag = parser.tag = parser.tags.pop()
    parser.tagName = parser.tag.name
    emitNode(parser, "onclosetag", parser.tagName)

    var x = {}
    for (var i in tag.ns) x[i] = tag.ns[i]

    var parent = parser.tags[parser.tags.length - 1] || parser
    if (parser.opt.xmlns && tag.ns !== parent.ns) {
      // remove namespace bindings introduced by tag
      Object.keys(tag.ns).forEach(function (p) {
        var n = tag.ns[p]
        emitNode(parser, "onclosenamespace", { prefix: p, uri: n })
      })
    }
  }
  if (t === 0) parser.closedRoot = true
  parser.tagName = parser.attribValue = parser.attribName = ""
  parser.attribList.length = 0
  parser.state = S.TEXT
}

function parseEntity (parser) {
  var entity = parser.entity
    , entityLC = entity.toLowerCase()
    , num
    , numStr = ""
  if (parser.ENTITIES[entity])
    return parser.ENTITIES[entity]
  if (parser.ENTITIES[entityLC])
    return parser.ENTITIES[entityLC]
  entity = entityLC
  if (entity.charAt(0) === "#") {
    if (entity.charAt(1) === "x") {
      entity = entity.slice(2)
      num = parseInt(entity, 16)
      numStr = num.toString(16)
    } else {
      entity = entity.slice(1)
      num = parseInt(entity, 10)
      numStr = num.toString(10)
    }
  }
  entity = entity.replace(/^0+/, "")
  if (numStr.toLowerCase() !== entity) {
    strictFail(parser, "Invalid character entity")
    return "&"+parser.entity + ";"
  }
  return String.fromCodePoint(num)
}

function write (chunk) {
  var parser = this
  if (this.error) throw this.error
  if (parser.closed) return error(parser,
    "Cannot write after close. Assign an onready handler.")
  if (chunk === null) return end(parser)
  var i = 0, c = ""
  while (parser.c = c = chunk.charAt(i++)) {
    if (parser.trackPosition) {
      parser.position ++
      if (c === "\n") {
        parser.line ++
        parser.column = 0
      } else parser.column ++
    }
    switch (parser.state) {

      case S.BEGIN:
        if (c === "<") {
          parser.state = S.OPEN_WAKA
          parser.startTagPosition = parser.position
        } else if (not(whitespace,c)) {
          // have to process this as a text node.
          // weird, but happens.
          strictFail(parser, "Non-whitespace before first tag.")
          parser.textNode = c
          parser.state = S.TEXT
        }
      continue

      case S.TEXT:
        if (parser.sawRoot && !parser.closedRoot) {
          var starti = i-1
          while (c && c!=="<" && c!=="&") {
            c = chunk.charAt(i++)
            if (c && parser.trackPosition) {
              parser.position ++
              if (c === "\n") {
                parser.line ++
                parser.column = 0
              } else parser.column ++
            }
          }
          parser.textNode += chunk.substring(starti, i-1)
        }
        if (c === "<") {
          parser.state = S.OPEN_WAKA
          parser.startTagPosition = parser.position
        } else {
          if (not(whitespace, c) && (!parser.sawRoot || parser.closedRoot))
            strictFail(parser, "Text data outside of root node.")
          if (c === "&") parser.state = S.TEXT_ENTITY
          else parser.textNode += c
        }
      continue

      case S.SCRIPT:
        // only non-strict
        if (c === "<") {
          parser.state = S.SCRIPT_ENDING
        } else parser.script += c
      continue

      case S.SCRIPT_ENDING:
        if (c === "/") {
          parser.state = S.CLOSE_TAG
        } else {
          parser.script += "<" + c
          parser.state = S.SCRIPT
        }
      continue

      case S.OPEN_WAKA:
        // either a /, ?, !, or text is coming next.
        if (c === "!") {
          parser.state = S.SGML_DECL
          parser.sgmlDecl = ""
        } else if (is(whitespace, c)) {
          // wait for it...
        } else if (is(nameStart,c)) {
          parser.state = S.OPEN_TAG
          parser.tagName = c
        } else if (c === "/") {
          parser.state = S.CLOSE_TAG
          parser.tagName = ""
        } else if (c === "?") {
          parser.state = S.PROC_INST
          parser.procInstName = parser.procInstBody = ""
        } else {
          strictFail(parser, "Unencoded <")
          // if there was some whitespace, then add that in.
          if (parser.startTagPosition + 1 < parser.position) {
            var pad = parser.position - parser.startTagPosition
            c = new Array(pad).join(" ") + c
          }
          parser.textNode += "<" + c
          parser.state = S.TEXT
        }
      continue

      case S.SGML_DECL:
        if ((parser.sgmlDecl+c).toUpperCase() === CDATA) {
          emitNode(parser, "onopencdata")
          parser.state = S.CDATA
          parser.sgmlDecl = ""
          parser.cdata = ""
        } else if (parser.sgmlDecl+c === "--") {
          parser.state = S.COMMENT
          parser.comment = ""
          parser.sgmlDecl = ""
        } else if ((parser.sgmlDecl+c).toUpperCase() === DOCTYPE) {
          parser.state = S.DOCTYPE
          if (parser.doctype || parser.sawRoot) strictFail(parser,
            "Inappropriately located doctype declaration")
          parser.doctype = ""
          parser.sgmlDecl = ""
        } else if (c === ">") {
          emitNode(parser, "onsgmldeclaration", parser.sgmlDecl)
          parser.sgmlDecl = ""
          parser.state = S.TEXT
        } else if (is(quote, c)) {
          parser.state = S.SGML_DECL_QUOTED
          parser.sgmlDecl += c
        } else parser.sgmlDecl += c
      continue

      case S.SGML_DECL_QUOTED:
        if (c === parser.q) {
          parser.state = S.SGML_DECL
          parser.q = ""
        }
        parser.sgmlDecl += c
      continue

      case S.DOCTYPE:
        if (c === ">") {
          parser.state = S.TEXT
          emitNode(parser, "ondoctype", parser.doctype)
          parser.doctype = true // just remember that we saw it.
        } else {
          parser.doctype += c
          if (c === "[") parser.state = S.DOCTYPE_DTD
          else if (is(quote, c)) {
            parser.state = S.DOCTYPE_QUOTED
            parser.q = c
          }
        }
      continue

      case S.DOCTYPE_QUOTED:
        parser.doctype += c
        if (c === parser.q) {
          parser.q = ""
          parser.state = S.DOCTYPE
        }
      continue

      case S.DOCTYPE_DTD:
        parser.doctype += c
        if (c === "]") parser.state = S.DOCTYPE
        else if (is(quote,c)) {
          parser.state = S.DOCTYPE_DTD_QUOTED
          parser.q = c
        }
      continue

      case S.DOCTYPE_DTD_QUOTED:
        parser.doctype += c
        if (c === parser.q) {
          parser.state = S.DOCTYPE_DTD
          parser.q = ""
        }
      continue

      case S.COMMENT:
        if (c === "-") parser.state = S.COMMENT_ENDING
        else parser.comment += c
      continue

      case S.COMMENT_ENDING:
        if (c === "-") {
          parser.state = S.COMMENT_ENDED
          parser.comment = textopts(parser.opt, parser.comment)
          if (parser.comment) emitNode(parser, "oncomment", parser.comment)
          parser.comment = ""
        } else {
          parser.comment += "-" + c
          parser.state = S.COMMENT
        }
      continue

      case S.COMMENT_ENDED:
        if (c !== ">") {
          strictFail(parser, "Malformed comment")
          // allow <!-- blah -- bloo --> in non-strict mode,
          // which is a comment of " blah -- bloo "
          parser.comment += "--" + c
          parser.state = S.COMMENT
        } else parser.state = S.TEXT
      continue

      case S.CDATA:
        if (c === "]") parser.state = S.CDATA_ENDING
        else parser.cdata += c
      continue

      case S.CDATA_ENDING:
        if (c === "]") parser.state = S.CDATA_ENDING_2
        else {
          parser.cdata += "]" + c
          parser.state = S.CDATA
        }
      continue

      case S.CDATA_ENDING_2:
        if (c === ">") {
          if (parser.cdata) emitNode(parser, "oncdata", parser.cdata)
          emitNode(parser, "onclosecdata")
          parser.cdata = ""
          parser.state = S.TEXT
        } else if (c === "]") {
          parser.cdata += "]"
        } else {
          parser.cdata += "]]" + c
          parser.state = S.CDATA
        }
      continue

      case S.PROC_INST:
        if (c === "?") parser.state = S.PROC_INST_ENDING
        else if (is(whitespace, c)) parser.state = S.PROC_INST_BODY
        else parser.procInstName += c
      continue

      case S.PROC_INST_BODY:
        if (!parser.procInstBody && is(whitespace, c)) continue
        else if (c === "?") parser.state = S.PROC_INST_ENDING
        else parser.procInstBody += c
      continue

      case S.PROC_INST_ENDING:
        if (c === ">") {
          emitNode(parser, "onprocessinginstruction", {
            name : parser.procInstName,
            body : parser.procInstBody
          })
          parser.procInstName = parser.procInstBody = ""
          parser.state = S.TEXT
        } else {
          parser.procInstBody += "?" + c
          parser.state = S.PROC_INST_BODY
        }
      continue

      case S.OPEN_TAG:
        if (is(nameBody, c)) parser.tagName += c
        else {
          newTag(parser)
          if (c === ">") openTag(parser)
          else if (c === "/") parser.state = S.OPEN_TAG_SLASH
          else {
            if (not(whitespace, c)) strictFail(
              parser, "Invalid character in tag name")
            parser.state = S.ATTRIB
          }
        }
      continue

      case S.OPEN_TAG_SLASH:
        if (c === ">") {
          openTag(parser, true)
          closeTag(parser)
        } else {
          strictFail(parser, "Forward-slash in opening tag not followed by >")
          parser.state = S.ATTRIB
        }
      continue

      case S.ATTRIB:
        // haven't read the attribute name yet.
        if (is(whitespace, c)) continue
        else if (c === ">") openTag(parser)
        else if (c === "/") parser.state = S.OPEN_TAG_SLASH
        else if (is(nameStart, c)) {
          parser.attribName = c
          parser.attribValue = ""
          parser.state = S.ATTRIB_NAME
        } else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_NAME:
        if (c === "=") parser.state = S.ATTRIB_VALUE
        else if (c === ">") {
          strictFail(parser, "Attribute without value")
          parser.attribValue = parser.attribName
          attrib(parser)
          openTag(parser)
        }
        else if (is(whitespace, c)) parser.state = S.ATTRIB_NAME_SAW_WHITE
        else if (is(nameBody, c)) parser.attribName += c
        else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_NAME_SAW_WHITE:
        if (c === "=") parser.state = S.ATTRIB_VALUE
        else if (is(whitespace, c)) continue
        else {
          strictFail(parser, "Attribute without value")
          parser.tag.attributes[parser.attribName] = ""
          parser.attribValue = ""
          emitNode(parser, "onattribute",
                   { name : parser.attribName, value : "" })
          parser.attribName = ""
          if (c === ">") openTag(parser)
          else if (is(nameStart, c)) {
            parser.attribName = c
            parser.state = S.ATTRIB_NAME
          } else {
            strictFail(parser, "Invalid attribute name")
            parser.state = S.ATTRIB
          }
        }
      continue

      case S.ATTRIB_VALUE:
        if (is(whitespace, c)) continue
        else if (is(quote, c)) {
          parser.q = c
          parser.state = S.ATTRIB_VALUE_QUOTED
        } else {
          strictFail(parser, "Unquoted attribute value")
          parser.state = S.ATTRIB_VALUE_UNQUOTED
          parser.attribValue = c
        }
      continue

      case S.ATTRIB_VALUE_QUOTED:
        if (c !== parser.q) {
          if (c === "&") parser.state = S.ATTRIB_VALUE_ENTITY_Q
          else parser.attribValue += c
          continue
        }
        attrib(parser)
        parser.q = ""
        parser.state = S.ATTRIB_VALUE_CLOSED
      continue

      case S.ATTRIB_VALUE_CLOSED:
        if (is(whitespace, c)) {
          parser.state = S.ATTRIB
        } else if (c === ">") openTag(parser)
        else if (c === "/") parser.state = S.OPEN_TAG_SLASH
        else if (is(nameStart, c)) {
          strictFail(parser, "No whitespace between attributes")
          parser.attribName = c
          parser.attribValue = ""
          parser.state = S.ATTRIB_NAME
        } else strictFail(parser, "Invalid attribute name")
      continue

      case S.ATTRIB_VALUE_UNQUOTED:
        if (not(attribEnd,c)) {
          if (c === "&") parser.state = S.ATTRIB_VALUE_ENTITY_U
          else parser.attribValue += c
          continue
        }
        attrib(parser)
        if (c === ">") openTag(parser)
        else parser.state = S.ATTRIB
      continue

      case S.CLOSE_TAG:
        if (!parser.tagName) {
          if (is(whitespace, c)) continue
          else if (not(nameStart, c)) {
            if (parser.script) {
              parser.script += "</" + c
              parser.state = S.SCRIPT
            } else {
              strictFail(parser, "Invalid tagname in closing tag.")
            }
          } else parser.tagName = c
        }
        else if (c === ">") closeTag(parser)
        else if (is(nameBody, c)) parser.tagName += c
        else if (parser.script) {
          parser.script += "</" + parser.tagName
          parser.tagName = ""
          parser.state = S.SCRIPT
        } else {
          if (not(whitespace, c)) strictFail(parser,
            "Invalid tagname in closing tag")
          parser.state = S.CLOSE_TAG_SAW_WHITE
        }
      continue

      case S.CLOSE_TAG_SAW_WHITE:
        if (is(whitespace, c)) continue
        if (c === ">") closeTag(parser)
        else strictFail(parser, "Invalid characters in closing tag")
      continue

      case S.TEXT_ENTITY:
      case S.ATTRIB_VALUE_ENTITY_Q:
      case S.ATTRIB_VALUE_ENTITY_U:
        switch(parser.state) {
          case S.TEXT_ENTITY:
            var returnState = S.TEXT, buffer = "textNode"
          break

          case S.ATTRIB_VALUE_ENTITY_Q:
            var returnState = S.ATTRIB_VALUE_QUOTED, buffer = "attribValue"
          break

          case S.ATTRIB_VALUE_ENTITY_U:
            var returnState = S.ATTRIB_VALUE_UNQUOTED, buffer = "attribValue"
          break
        }
        if (c === ";") {
          parser[buffer] += parseEntity(parser)
          parser.entity = ""
          parser.state = returnState
        }
        else if (is(entity, c)) parser.entity += c
        else {
          strictFail(parser, "Invalid character entity")
          parser[buffer] += "&" + parser.entity + c
          parser.entity = ""
          parser.state = returnState
        }
      continue

      default:
        throw new Error(parser, "Unknown state: " + parser.state)
    }
  } // while
  // cdata blocks can get very big under normal conditions. emit and move on.
  // if (parser.state === S.CDATA && parser.cdata) {
  //   emitNode(parser, "oncdata", parser.cdata)
  //   parser.cdata = ""
  // }
  if (parser.position >= parser.bufferCheckPosition) checkBufferLength(parser)
  return parser
}

/*! http://mths.be/fromcodepoint v0.1.0 by @mathias */
if (!String.fromCodePoint) {
        (function() {
                var stringFromCharCode = String.fromCharCode;
                var floor = Math.floor;
                var fromCodePoint = function() {
                        var MAX_SIZE = 0x4000;
                        var codeUnits = [];
                        var highSurrogate;
                        var lowSurrogate;
                        var index = -1;
                        var length = arguments.length;
                        if (!length) {
                                return '';
                        }
                        var result = '';
                        while (++index < length) {
                                var codePoint = Number(arguments[index]);
                                if (
                                        !isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
                                        codePoint < 0 || // not a valid Unicode code point
                                        codePoint > 0x10FFFF || // not a valid Unicode code point
                                        floor(codePoint) != codePoint // not an integer
                                ) {
                                        throw RangeError('Invalid code point: ' + codePoint);
                                }
                                if (codePoint <= 0xFFFF) { // BMP code point
                                        codeUnits.push(codePoint);
                                } else { // Astral code point; split in surrogate halves
                                        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
                                        codePoint -= 0x10000;
                                        highSurrogate = (codePoint >> 10) + 0xD800;
                                        lowSurrogate = (codePoint % 0x400) + 0xDC00;
                                        codeUnits.push(highSurrogate, lowSurrogate);
                                }
                                if (index + 1 == length || codeUnits.length > MAX_SIZE) {
                                        result += stringFromCharCode.apply(null, codeUnits);
                                        codeUnits.length = 0;
                                }
                        }
                        return result;
                };
                if (Object.defineProperty) {
                        Object.defineProperty(String, 'fromCodePoint', {
                                'value': fromCodePoint,
                                'configurable': true,
                                'writable': true
                        });
                } else {
                        String.fromCodePoint = fromCodePoint;
                }
        }());
}

})(typeof exports === "undefined" ? sax = {} : exports);

},{"stream":undefined,"string_decoder":undefined}],44:[function(require,module,exports){
module.exports="一切 所以 菩薩 佛教 大正 佛法 大乘 比丘 沒有 眾生 如來 就是 如是 分別 不能 這是 般若 所說 相應 涅槃 解脫 不同 不是 世間 不可 法的 清淨 阿含 緣起 菩提 是不 大師 自性 這樣 說的 弟子 可以 波羅 正二 都是 世尊 生死 自己 煩惱 樣的 因緣 有的 出家 什麼 功德 方便 含經 切法 現在 以為 也就 印度 中國 差別 唯識 傳說 有部 佛說 切有 根本 佛的 無常 種種 也是 的意 名為 一般 羅蜜 來藏 即是 我們 阿毘 而不 究竟 法門 婆沙 意義 教的 聲聞 生的 修行 也不 是有 毘婆 說法 是我 解說 十二 思想 成佛 云何 是無 世界 過去 來的 諸比 說到 三昧 還是 成為 無我 說明 大眾 的佛 只是 的大 可說 成就 舍利 真實 是名 學者 佛所 來說 因為 無所 中的 達磨 智慧 諸法 瑜伽 一二 是佛 二十 對於 說是 稱為 尊者 所有 心的 爾時 部分 成立 的不 應該 是說 性空 一樣 起的 譬喻 無量 正法 釋尊 他的 婆羅 卷二 不知 沙論 毘達 雜阿 有情 由於 如此 次第 歡喜 法性 性的 修習 為了 知道 淨土 無明 若波 真如 如實 不過 以說 摩訶 可能 一時 平等 乃至 種子 研究 人的 宗教 也有 同的 羅門 的傳 時代 存在 賴耶 一三 間的 起來 觀察 他們 生滅 二二 可得 大毘 卷三 念佛 具足 不得 莊嚴 問題 上座 關係 才能 的法 圓滿 人類 未來 法界 者的 到了 部的 利弗 第二 當然 文殊 多羅 人間 境界 行的 不但 應部 供養 南傳 出世 阿難 和合 實有 世俗 知識 法身 一五 生起 我聞 二七 相續 一定 羅漢 無有 一四 而有 三十 這些 識的 發展 修學 外道 的生 結集 因果 沙門 的真 僧伽 身心 諸佛 提心 還有 是從 是這 當時 乘佛 龍樹 佛住 法中 的說 是依 內容 有所 我所 生活 有關 其實 是以 的事 法師 不生 的根 原本 的時 佛陀 自在 一六 小乘 出來 薩的 是大 聞佛 阿羅 雜染 我的 在家 並不 西元 在的 部派 的人 陀羅 認識 發心 在這 主要 虛妄 阿賴 二三 非常 無漏 就不 思惟 卷四 乘的 不離 己的 十八 的心 決定 道的 相同 屬於 可見 作用 的自 於此 二五 以後 為佛 的無 這種 不會 不斷 若經 彌陀 譯的 增上 勝義 所依 別的 嚴經 有了 的本 分律 二四 方面 銅鍱 迦葉 毘尼 有人 經中 的方 別說 於佛 說為 舍衛 乘經 精進 重於 正見 華嚴 建立 多少 意識 心所 佛學 而成 引起 無為 第三 的分 而說 空的 無相 切眾 所傳 的解 當知 不善 熏習 義的 自然 有為 的特 孤獨 都不 事實 如說 金剛 不相 要的 論師 論的 此經 在佛 大智 是故 無上 這裡 布施 的修 說此 一八 慈悲 光明 奉行 實的 能說 阿彌 僧祇 表示 給孤 而已 虛空 本論 楞伽 學佛 四十 精神 何等 無分 空性 蜜多 家的 有不 十六 法是 初期 國佛 意思 有二 為法 經部 度論 重要 法空 這就 是為 二九 衛國 的正 是如 社會 的因 無邊 善法 的實 本來 中道 有無 的三 怎樣 人生 這不 假名 一七 所作 得到 適應 一法 的論 上的 耶識 彌勒 獨園 祇樹 相當 唯心 樹給 三世 代的 釋迦 說有 的見 論者 有三 的思 覺得 界的 特別 說偈 白佛 佛告 是沒 同時 一九 真常 三寶 二六 諸行 時間 佛性 所見 了解 智度 成的 甚深 影響 信仰 神會 理論 正三 學的 丘尼 三二 或者 中觀 的經 是真 所得 而是 內心 毘曇 一個 因此 於是 實知 不應 遠離 二八 心論 定的 西方 經已 不見 原始 化的 而得 師的 理解 凡夫 為什 是在 十五 上說 是法 依他 不如 然是 住舍 無自 傳的 長者 薩行 的教 實在 立的 卷五 這才 分為 時的 亦不 的關 國祇 行者 一致 育王 而來 丘聞 相的 乘法 也可 三藏 三種 的功 們的 緣生 那就 四分 三三 自體 經論 通達 等為 是自 得的 世親 見的 歸依 告諸 流轉 東方 心不 聖諦 的信 的是 以不 眾部 的理 有些 常住 中心 不起 為主 滅的 淨的 佛弟 十三 喜奉 所緣 那樣 廣大 剎那 依止 聖者 實相 世紀 由此 無生 聖典 法相 作是 容易 蜜經 相合 是空 般涅 施設 完全 本生 說不 文化 一種 大家 法不 教化 為大 正覺 以前 方法 安立 十四 譯本 天子 五五 四種 往生 二種 寂滅 的學 重視 有漏 那麼 為本 本性 譯為 大般 十誦 以佛 慧能 法無 生命 中有 中阿 能不 生不 尊告 以來 雖然 的主 系的 為無 依此 梵行 其他 所不 伽師 前後 見佛 而且 國的 所謂 大的 四諦 理的 而生 此而 羅提 傾向 受到 本的 的地 悟入 所譯 集成 能得 無礙 經的 地獄 壇經 體的 的作 顛倒 的菩 品般 唯有 的發 與佛 二者 三五 二乘 見解 似乎 十方 隨順 阿育 的內 怎麼 古代 到底 之為 一部 是非 五百 有說 有這 不淨 畢竟 現實 是可 離欲 信心 後來 利益 懺悔 得解 所知 誦律 類的 然而 木叉 四五 成實 著重 提木 就有 不成 復次 的名 都有 出的 祇律 共同 如何 五蘊 不空 攝受 的中 不了 徹底 一分 代表 組織 五分 理想 十七 經說 教界 開示 如幻 能成 善知 佛言 受持 活動 十地 譬如 佛道 是世 行為 期大 不免 犍度 玄奘 有自 度的 或是 是菩 子的 但是 真理 五六 正確 的有 三四 以此 相近 大悲 也說 隨喜 真諦 流行 顯現 陀佛 的觀 三九 但在 讚歎 之所 正八 如法 的境 那是 實際 一面 是人 多聞 為三 五十 善根 淨心 不合 不動 正理 想的 也還 上面 過程 一下 這可 伽羅 分的 安樂 地論 為中 時有 聚落 門下 這個 四六 現前 現起 摩羅 教之 所生 是相 切的 確的 是因 的重 不共 法而 俱舍 為自 那裡 我不 的過 為人 本經 引發 廣說 不變 奈耶 有佛 力量 得無 斷的 遍計 持戒 於諸 後有 的現 偈頌 上帝 般的 善財 變化 身體 無始 宗的 一心 經典 常的 不滅 是念 思議 而起 以上 無著 四二 果的 一類 的宗 毘奈 自由 的成 居士 有生 我今 民國 到的 作為 明白 才是 南方 真正 有什 中說 其中 期的 有四 自相 的相 對的 見到 四九 識學 文字 世的 認為 能生 對治 立場 三乘 證的 目的 於彼 答言 明了 為不 是生 三七 然後 以外 完成 不再 多的 王舍 達摩 現象 時候 四大 的原 的差 亦無 三八 主張 五四 犢子 的緣 如上 四七 必須 證得 大德 北方 十九 若有 禪定 空寂 希望 相對 四四 此中 但這 自我 不受 聖弟 有此 利他 法藏 增支 修多 說無 者所 支部 伽經 但不 派的 第四 該是 方的 四三 偈言 的如 是什 錫蘭 他起 非有 德的 是由 中論 的苦 瞿曇 表現 的身 後的 方廣 一乘 與大 顯示 錯誤 寂靜 知見 提婆 道德 四八 正五 這都 十年 西域 為我 與無 達到 優婆 增長 住的 心中 總之 心識 般人 作意 地方 日本 以有 同樣 從此 死的 三六 諸天 所引 為二 識論 以無 是心 以下 稽首 二年 也沒 關於 一義 必然 實性 大方 佛為 了知 於大 座部 五三 的種 合的 愚癡 為有 悲心 鍱律 聖道 政治 個人 有我 了義 出於 是實 舍城 的所 昧經 一的 禪師 用的 卷六 意見 亦復 別智 為是 語言 別譯 無論 無間 在大 還不 記說 智論 安住 舍論 精舍 為他 名字 一向 彼此 的體 百年 的存 等於 性清 的精 這三 那時 無色 不說 不為 優波 稱之 法華 也許 六處 所取 是對 心性 然的 五七 的開 苦痛 得不 乘論 過失 師地 意的 的部 開展 實是 了這 如不 即不 作者 我是 一位 三者 聞法 的異 正道 父母 恭敬 然不 的善 明的 而又 決不 會的 依於 的聖 情形 現法 物質 一直 滿足 我見 去了 起法 正念 發智 開始 磨論 者是 有如 以是 國家 看來 五二 不失 卷七 一步 並非 戲論 小品 的情 須菩 二部 藥師 鍱部 如有 抉擇 法說 等到 現存 的影 是三 梵天 秘密 已經 罽賓 虛大 不退 慧的 綜合 是最 陀那 是與 階段 有法 是要 是常 即使 一些 需要 學派 障礙 的世 故彼 有相 超越 受具 的立 善惡 定是 教中 本是 本說 我說 亦如 無性 二分 者何 力的 本作 經文 為四 的二 入處 現的 勝鬘 發菩 阿閦 一經 不異 的禪 而為 發生 二諦 空無 的四 七五 帝釋 人所 於法 念處 他是 人說 善巧 的空 雖有 護法 師利 不覺 從佛 是緣 迦旃 和尚 名的 譯出 六識 貪欲 的智 槃經 這部 切佛 顯然 旃延 到達 的神 起初 眾多 承認 論是 問答 於中 殊師 的結 順正 等的 而後 又如 法者 六十 者阿 大菩 的阿 六六 宋本 的行 卷九 向於 這與 這二 自身 前的 一者 自覺 普遍 要是 自傳 說如 受戒 去的 不出 心而 的問 以者 可是 門的 依佛 眾的 重在 特色 不壞 神通 邪見 三界 看作 部毘 是重 業力 殊勝 近於 是同 傳統 有大 寶積 經過 妄分 受用 女人 神教 的道 的文 俗的 下來 中部 長阿 華經 佛菩 教史 戒的 轉依 無餘 於自 尊重 不要 不樂 當的 善的 惡業 在世 無不 來所 禪宗 五八 加以 空義 異譯 正的 訶般 法與 現代 法有 漢譯 其心 被稱 的出 脫的 瞋恚 放逸 執著 是苦 為眾 七六 三論 對佛 佛滅 時彼 所問 佛在 出離 所成 本有 實現 是阿 一上 此法 六七 卷上 又說 身的 現行 應的 此為 名色 所攝 八九 還沒 進修 圓成 是出 普賢 一點 男子 佛國 藏經 佛與 淨法 或說 二類 七七 特伽 正是 本淨 有時 與不 深入 攝大 有著 補特 六五 分化 於無 性是 事業 應有 僧團 示了 福德 經驗 於世 性不 天上 而能 住處 果報 六二 漸漸 最後 自心 雖不 尊的 三年 與法 六九 戒經 它的 心是 能為 依宋 是經 乞食 長老 苦行 的對 羯磨 而無 隨眠 存的 不容 者說 非無 若無 薩婆 說名 生無 土的 是比 五上 修證 主的 根性 論書 命終 一生 別是 五九 知的 而發 三摩 是本 加行 了的 破壞 信解 度佛 是否 應知 教授 喻師 真是 民族 了佛 觀的 是假 使他 七四 異熟 信眾 下的 獲得 二中 為依 而引 的深 八二 無二 去世 學處 復如 卷八 的定 以及 三菩 重的 二上 生法 生天 別論 僧眾 何以 敘述 七二 性論 外的 覺的 六下 西藏 證明 而修 根源 老死 而去 的共 三上 集的 展轉 是修 飲食 諸有 能知 九二 心境 行道 的了 為因 善業 多數 不以 四上 七三 切諸 三法 的淨 七中 六上 樣說 有實 經上 增壹 作的 法義 注意 七上 自利 面的 通於 二下 域記 家人 心相 七八 能見 形成 是諸 起信 的五 耶和 為菩 五年 大迦 說中 以大 壹阿 言說 這也 十住 三經 就能 住持 而實 東西 和華 勝解 是中 空中 是受 達多 一人 六四 宣說 為說 惡趣 薩道 不在 的唯 一年 一卷 所能 藏的 十善 的前 法為 對象 假使 佛是 否定 能夠 從前 陀的 要有 在中 好的 其所 緣的 部經 出現 編入 復有 動的 人天 太虛 跋陀 確是 六八 無限 一方 絕對 的力 六三 大小 有異 是能 七九 地位 別人 憶念 特性 實論 的認 後期 至於 教徒 的業 有五 法會 作如 解釋 心為 青年 三類 凡是 國王 師子 近代 之研 薩所 九上 對立 環境 善男 五下 國土 無法 滿的 制度 非我 情的 互相 婆多 巴利 識為 二經 理由 結合 滅盡 證悟 是正 調伏 事相 的眾 是現 正觀 以在 神的 不二 值得 積經 護持 出三 依的 竟的 八中 有多 觀念 六中 集經 特殊 夜叉 樂的 種的 磨大 識所 在說 鳩摩 難得 九三 為五 切都 佛土 非法 則不 於這 阿耨 說系 論究 關的 努力 說部 始佛 新的 又有 所應 見地 者不 八四 覺分 行相 羅什 一中 為生 閦佛 馬鳴 分教 所執 明本 所行 寺院 使人 說得 最初 意趣 都可 於三 別有 明確 入法 詣佛 甚至 苦的 生於 五種 為如 佛足 地的 生有 六年 在不 學習 是眾 色界 子所 要求 為緣 共相 能的 無差 何為 程中 的集 得勒 九中 有能 天的 還要 自知 他人 一念 五中 摩得 來不 九下 行中 本改 生中 佛世 這在 只有 勒伽 緣而 而現 修持 和平 一說 致的 的可 編集 一日 不住 布薩 假有 名言 所造 於現 法律 竟空 三藐 大會 性本 非想 律儀 問經 自他 實體 出了 之佛 不現 善哉 反而 就可 的次 傳出 契經 欲界 的僧 極樂 生而 不作 識是 如大 而作 後代 王的 無記 我我 藐三 八上 八八 道理 家庭 所現 自證 不自 先後 緣覺 大寶 佛之 年的 長部 此二 的流 傳來 除了 不明 修道 以自 退坐 說相 不必 苦滅 進入 所起 法所 入的 九六 略說 智的 並沒 經濟 是善 有種 法如 不思 出入 卷下 我國 實不 依據 的研 法救 都沒 五欲 接受 發願 中所 發起 正行 蓮華 只要 本不 羅三 來是 汝等 形式 辟支 曹溪 法之 文句 歸於 是觀 結果 佛果 不足 充滿 摩地 解的 論義 繼承 的要 臺灣 皆是 有餘 八下 為阿 四中 迴向 心與 不著 一是 王朝 妄執 的果 訶僧 生身 故名 長行 一項 流傳 總是 梵語 此三 為所 三中 三下 住在 支佛 能取 明顯 惡的 很多 無別 成了 成熟 不外 喜隨 是四 若不 可思 在生 八五 而沒 得阿 定慧 的十 不正 耨多 微細 以這 哲學 入涅 於色 了生 何所 九七 依經 八七 見了 人心 延續 四部 依法 以名 槃的 知是 為這 元前 是怎 理性 就會 八三 典的 首佛 現證 比較 信佛 底的 故說 的和 德行 八六 起而 五陰 六度 尊說 從來 世友 心解 維摩 到這 色身 是多 合理 能了 入於 不妨 眼識 墮落 是二 弘法 深的 子部 聽聞 而自 切種 唐譯 能是 大海 譯作 是離 行無 為世 興起 大行 初學 羅尼 中間 實行 二百 有差 名稱 是見 遊行 起了 不信 的清 信的 九四 羅王 善見 深義 上來 七年 空是 住於 恐怖 與人 能有 男女 人不 心心 此有 於人 童子 說我 九五 想像 相依 九九 始終 三部 原則 深密 後世 體性 一次 八年 有分 的我 不論 生生 在我 到佛 矛盾 從緣 僧傳 是很 反對 第五 在人 的比 天神 說他 學院 方佛 因而 如理 迦佛 的古 一天 空相 是則 已有 引用 此是 為空 證入 功能 的別 九八 惱的 彼天 一大 統的 否則 現觀 相違 這如 能自 派佛 有心 如佛 於我 所證 智者 現生 要說 正信 的第 造作 四禪 四無 的假 惡行 的同 的形 顯的 是學 實無 佛名 法住 四年 四念 變易 合於 然也 今日 住地 造的 無因 無數 寶性 於正 七百 住不 說佛 古人 律的 是事 便是 善行 又是 或有 等正 但有 三大 以成 二大 大體 批評 教育 親近 雜事 能證 底是 下去 猶如 心無 空而 見於 必要 的新 比喻 部類 大願 論到 只能 是虛 八正 本義 龍王 卻是 甘露 子說 即說 再說 他說 訶迦 染污 名無 即有 有名 少數 禪者 尊敬 的煩 所在 卻不 法護 大地 心理 向上 教法 苦不 滅道 的性 來生 生心 四經 以如 大唐 是極 法輪 切智 天王 應當 苦惱 從無 竺法 有真 乘行 與我 的最 法法 解決 世人 淨化 法體 度眾 義相 都無 與阿 一味 有過 教會 論說 品類 修正 之中 相而 牟尼 為諸 傳承 各有 叫做 義說 的動 宇宙 是所 而住 的德 得了 道跡 法行 相關 依緣 苦樂 行而 的知 是應 染著 無實 化為 法本 為真 說過 正定 佛不 若法 得自 祇夜 第十 領導 原因 有十 成唯 麼都 五根 會有 一番 有色 故事 知此 才有 是屬 固有 實為 有因 從這 入佛 修定 義是 易行 習氣 以能 現出 的必 過了 諍論 一意 師所 有是 念念 六波 說三 正受 能引 弘忍 如以 的通 是神 八十 無盡 正思 毘舍 亦有 獨立 戒本 此說 繫縛 生故 最勝 各部 充分 終於 師說 的弟 滅故 有故 憂苦 識中 觀者 有眾 般舟 曾有 於如 諦的 此的 如果 五部 非實 於空 是約 提出 法自 真的 阿那 饒益 於四 初發 第六 大概 雖是 在無 如前 堅固 能離 進步 緣故 可知 無想 上菩 發現 死了 或作 境的 就在 實踐 無住 若於 不少 有他 知不 於心 生淨 略有 運動 以稱 變異 根據 性而 是通 眾中 為第 家眾 北印 佛經 記集 是隨 微妙 不放 離開 不久 說者 行經 難陀 一再 十種 此外 佛像 要從 麼是 廣佛 無作 悟的 法印 變的 資糧 的感 偉大 發揚 修的 婆塞 偏重 期佛 的譯 無畏 義諦 老病 神秀 輪迴 有非 的錯 面說 七下 佛華 又不 必有 厭離 化身 得法 念住 內外 著的 五日 離的 這麼 論中 悲願 大目 不只 的依 解深 教說 有兩 小部 為的 的能 是上 者舍 部論 脫生 曇論 體驗 婆達 有見 王經 舟三 不取 藏記 揵連 八經 切煩 與此 切皆 多部 是聖 伽的 在印 善導 不及 天竺 人人 的目 真相 發達 文的 目揵 我在 病死 說空 通俗 覺支 不到 見法 命的 業的 覺知 同情 大品 不然 四下 彌羅 為正 可分 法寶 的證 為實 量的 受生 的表 又卷 修菩 受的 有力 是釋 得生 演培 生在 過是 有而 藏部 部所 真義 和樂 信願 導寺 與世 不依 來詣 是分 見道 摩竭 多經 死後 的在 質的 所共 如下 喜樂 現於 優陀 在有 通的 的六 不定 處的 分析 得多 非不 說而 第七 定要 精勤 三品 大抵 來了 勒菩 生是 常唯 的涅 當來 能與 難以 空有 舍離 它是 心行 威儀 然在 而在 相似 不用 即無 住王 經律 展中 海十 有意 傳授 最高 之法 救濟 戒律 是五 主持 切是 切相 以我 事物 情況 外境 異部 定義 是色 摩詰 人之 西北 五事 道是 伽論 傳二 仙人 殺生 緣相 深刻 藏說 各各 今改 含有 論議 前生 能以 合而 色的 人以 式的 為最 尤其 鬼神 天下 下品 發見 法句 同意 是後 之學 失去 而外 於其 恆河 步的 講堂 中品 多了 蘭若 方等 根有 三相 中去 為相 阿闍 化眾 道場 有出 色法 所斷 顯出 科學 就沒 多修 應用 他不 沙彌 在是 此相 那羅 說了 性相 九分 六經 師之 的活 生已 有諸 是第 定為 迦王 香港 無知 大法 得大 師資 量壽 唐西 能令 有與 的變 密經 兜率 月十 離心 為十 我當 五戒 六種 是知 受正 染法 分類 是那 以故 不曾 苦集 部中 物的 有點 的義 有空 將來 我與 餓鬼 往來 不苦 平常 的光 乘學 依處 感覺 主體 在此 接近 性質 沙師 異名 琉璃 諸根 三分 有緣 種不 以法 惡不 畜生 東山 定有 早期 也即 俗諦 認的 退轉 的東 信論 聖人 如如 而以 不復 自以 所修 正四 得成 於生 止觀 地經 其是 子們 族的 即此 道信 部系 四聖 先生 示現 這兩 天臺 不捨 無可 的安 我於 若比 即能 行善 論宗 計所 已盡 羅陀 都說 但說 自稱 國人 未生 第八 道品 或譯 具有 死流 從自 七經 使我 然有 這四 的戒 行法 入大 不實 六入 是等 為善 切世 的勝 名有 的廣 道行 自有 長夜 大事 而顯 有之 的話 的基 受後 聖教 為根 有以 論釋 在於 七日 雜藏 受陰 不滿 得來 異的 出發 大學 為上 工作 了不 二法 不與 所顯 還滅 而行 牛頭 細的 宗輪 教誡 引導 於有 大部 之道 正量 集出 未曾 五經 上所 何名 人與 事理 二月 是道 共住 樹下 等法 直到 終不 我等 弘揚 無心 定了 即空 極為 者之 作禮 輪論 於後 類似 佛出 二相 教聖 體悟 禪的 無疑 律藏 聞乘 於所 復興 部宗 我也 真心 聞聖 也要 推論 知法 能使 一不 首先 正知 是十 早已 雖說 一段 說起 部說 各別 常說 須蜜 一百 益眾 之說 逐漸 以從 安隱 衣服 離於 麼不 佛身 能發 歷史 法實 五法 妄心 都在 斷煩 有其 妙法 彼有 感到 的初 影像 生者 記錄 為宗 的究 罪惡 目犍 的組 在西 樂受 要知 眷屬 接著 續的 盛行 正智 非非 應行 是唯 能正 界中 造成 來世 染的 識與 勤修 阿僧 境相 公認 足以 我為 密大 在那 永遠 律制 信受 大苦 生所 二邊 維持 憂悲 取的 彼岸 事的 灌頂 禮佛 外乎 任何 無念 師於 本為 的進 持的 此無 所住 最為 從事 也能 大致 百結 的慈 大集 切善 王子 漸的 大天 我無 死苦 婆須 義不 佛化 而轉 義空 復說 滅法 主義 與說 本體 以也 染淨 色相 人有 部律 化地 士夫 家弟 歡迎 復問 教理 弗阿 離諸 聞熏 整理 要在 行於 能斷 楞嚴 已作 攝論 修羅 以經 空宗 識不 見有 不大 是根 忽略 的傾 空者 可意 我以 離生 我想 集論 的尊 也與 如化 地菩 而非 地區 二說 一行 見律 聽了 的色 漏的 已生 者大 禮拜 九年 與心 為性 全部 法以 進而 依三 無學 態度 犍連 有菩 缺乏 不許 離了 蘭陀 的統 教所 一佛 有明 出版 久住 此不 所集 但也 還在 雪山 性有 種相 的惡 謂於 義理 義故 我慢 流通 沙塞 相不 阿修 與自 來有 心得 諸漏 嚴重 奴隸 八日 起性 睡眠 有可 本無 傳譯 見我 以三 壽命 曇無 慧學 能解 滅無 薩羅 諸眾 出息 拙作 論主 波斯 轉法 了大 佛以 南印 六祖 基礎 為六 誤解 演化 受了 即沒 壞淨 禪法 或以 也都 有六 心生 進行 義為 唯是 尼母 的諸 為方 見不 相反 的福 一月 不染 有性 何況 更有 隨時 人是 保持 前三 而大 大王 法也 元二 別名 即於 而論 六根 尊所 在修 的天 邊際 難的 也只 常無 境地 落主 則無 二卷 緣和 南宗 林中 結論 名相 衰落 元年 到處 源於 是行 是思 得涅 難行 入無 是平 業報 於不 數的 形態 竹園 的利 普陀 前二 論題 繫念 此義 和上 二無 也如 的兩 其餘 無異 淨戒 三日 深法 離垢 識身 者以 彌沙 三月 我執 共有 是他 乘共 而可 丘白 諸菩 們所 末後 須彌 迦蘭 參考 財物 向佛 不已 以分 是語 賢聖 四句 尋思 如人 法則 所受 門瞿 名號 此生 念不 年來 許多 心法 母經 別立 於他 相待 論典 大有 現為 是身 現有 不從 想到 面所 四法 笈多 極微 切功 三說 條件 與上 一句 性說 高的 合為 頭陀 若諸 師長 與菩 往詣 則為 靜慮 演變 兩種 空與 眾苦 色等 價值 夫人 生受 限於 有善 內在 一節 流支 不易 趣入 坐禪 輪王 的譬 是成 付法 本身 名義 等所 處處 惱所 界品 不也 悉檀 須陀 付囑 相互 初地 者摩 於西 說大 先說 法來 能如 一事 即以 經是 事跡 參加 地藏 作佛 是印 伽行 決非 而到 之大 辦法 在前 先有 念的 的聲 就成 取相 有作 宗派 引生 八部 妄想 毫無 而立 明淨 少有 見者 轉變 所法 燉煌 表達 阿蘭 都能 音聲 有比 見為 舉行 示的 誤會 量部 種性 意樂 時期 天國 的長 聞的 僅是 中無 本識 幾乎 以叫 降伏 具體 相是 其後 是處 七十 共法 九經 從大 色是 人身 困難 心之 未能 等大 出生 起是 不敢 些人 心念 亦名 利的 錯亂 及其 與真 的妄 故不 陀經 預流 諸大 眾系 列舉 欲貪 善心 不殺 深切 根機 波離 及諸 心有 淨信 取著 緣所 行是 作品 教學 分出 心修 與如 得有 文明 如從 法皆 說經 正義 法顯 磨的 的語 見色 典之 就以 神秘 同學 能於 生之 不增 無關 安定 四阿 怖畏 者為 賢首 睺羅 漏盡 起無 彼比 帝的 作證 量無 於苦 間等 也好 人民 百千 在內 佛三 佛者 如能 定心 到大 性無 於內 去者 二項 人物 行三 破斥 同於 空不 在現 一世 識無 安居 了無 入滅 遍的 生與 是當 有成 佛而 長期 痛苦 書寫 習的 說四 薩戒 慈心 不願 苾芻 道中 滅諦 欲的 為後 二世 樂世 過著 言之 與中 究的 有律 與有 不盡 我法 曇心 奘譯 提到 喻者 發揮 為道 制的 不像 今當 誦經 革命 說諸 是難 跋渠 苦難 法故 確定 己所 閻浮 轉識 未得 陀竹 於真 十卷 證法 破僧 度之 等覺 若是 丘的 為先 子老 無非 持經 學問 斷除 覺了 殊的 身中 的念 世時 行願 質多 後起 識宗 的確 邊的 之間 師們 非是 本事 於眾 這雖 亦非 一系 好像 說言 有滅 名不 默然 善說 妄語 的階 專心 作已 為修 處相 切無 滅而 達羅 理智 五識 來無 有學 參閱 常見 三事 所染 說出 而進 空即 能從 塞部 們不 二因 本願 但從 而分 智證 是智 體系 聽法 願力 不問 於阿 南北 不夠 一體 或不 是勝 如無 傳入 為非 密的 能作 性為 的受 空為 宗旨 知有 過患 了別 界是 識者 指出 特重 想非 方式 怎能 識而 目標 神力 等諸 後得 名詞 戒法 過於 脫門 的上 於二 當為 永斷 是主 亂的 不解 是解 迦溼 基督 確實 心地 心者 人也 儒家 生存 擴大 寶的 以解 者也 則是 為其 間法 教典 如世 傳誦 實義 論所 契合 位的 慚愧 兩大 不修 的虛 的悲 客塵 城迦 異說 融攝 到現 並無 竭陀 這點 和醯 陀洹 業障 世法 與他 的小 而入 麼可 苦聚 全體 礙的 功用 來法 議的 生長 九十 更不 都與 別解 漸次 過的 婆夷 毘羅 清涼 假定 迦耶 新論 依如 以正 相在 經法 溼彌 的來 某些 由是 年代 有果 否認 外人 告比 複雜 簡略 定中 為之 等無 門教 上海 以修 大慈 崇高 遠的 丈夫 聖法 皆空 部和 與論 覺悟 無諍 般所 波逸 淺深 誤的 生時 加上 傳法 不太 的熏 觀音 元四 不重 適合 應為 體相 論之 執有 相好 有愛 樹的 無的 以生 聽說 不立 義而 各種 是般 高僧 離不 能所 因有 法上 阿波 竟圓 了自 寺的 伽藍 類集 樂住 不忘 展的 象的 而出 就說 最上 別為 亦爾 度人 因素 與經 恰好 就要 袈裟 為心 受者 上文 尊為 在三 三學 等不 逸提 偈答 是初 反之 如沒 的布 家者 二門 天台 生為 求佛 能修 史的 二緣 而佛 悔過 佛也 希有 觀無 為欲 行不 依無 的故 有系 例如 能入 能力 八不 有智 懷疑 大經 晚年 稱名 發的 年撰 生了 沒不 制立 吠陀 欲樂 觀法 乘不 說與 首禮 故有 行人 薩迦 惱苦 得名 雜含 做到 女眾 類論 來看 十日 無願 一期 推定 裡的 有身 觀慧 滿了 論為 耶穌 義品 法經 中最 如虛 相有 的總 把握 遍知 是究 似的 有受 中印 勝利 文義 於五 應以 過來 說轉 以心 醯五 給予 羅睺 不墮 羅的 見是 的明 法時 十餘 人都 但為 不隨 了達 泥洹 住世 他所 有正 是信 的國 來之 與唯 與生 悉皆 四者 實上 作惡 學之 彼諸 入世 本佛 的化 石頭 題的 毱多 的多 大同 其身 是古 是意 要以 不完 堪能 說緣 生人 天人 趣向 理學 元三 常在 生老 教是 觀點 傳十 也應 是別 是過 是外 更多 都以 我有 生果 放光 是適 一問 從座 曾說 得道 在自 轉的 採取 有信 之相 耶舍 羅國 正命 若的 有重 少分 道所 行般 道安 入息 人在 讀誦 以要 即為 釋種 時尊 處所 這應 苦邊 的律 人中 三天 是西 此五 是天 的為 大藏 切不 薩說 佛本 丘們 雖沒 政府 是廣 傳為 經所 有宗 與眾 事情 來解 慧解 家菩 是涅 在十 阿摩 始以 是各 嚴的 刻的 我生 的先 更為 的記 部為 皆悉 生諸 比對 俱生 的風 小小 也會 末那 繫著 梵本 尼摩 不由 直覺 提舍 作業 空經 人而 教義 如依 不清 正七 遊化 疑惑 考察 以空 是小 波提 滅相 化而 重大 如經 兒女 流出 伽陀 以世 藏識 一處 密切 如我 是傳 彼生 為種 是先 相結 攝持 深廣 可信 死中 著名 迦牟 師與 於未 現了 異生 是識 彼於 一帶 創造 持佛 彼彼 修慧 動作 自作 子吼 犯戒 遍照 二節 是六 客觀 多年 曾經 先要 就的 不去 學大 惡道 漏種 是內 統攝 有論 的覺 有深 其為 禮足 頌的 在天 共的 心即 願意 乘道 守護 看出 性與 但以 之本 潮音 能在 於上 薩是 性故 密宗 薩經 祭祀 理作 從因 名第 梵志 地部 有有 疑的 散亂 世有 的也 剛般 得佛 啟發 為體 空間 王時 意志 是清 懈怠 積集 釋論 學風 問訊 四日 純大 離去 利安 的增 正九 諸受 是遍 北宗 說阿 佛前 觀佛 百五 討論 麼說 早就 但還 團的 乎是 的圓 以菩 會中 應作 教者 但佛 說這 大陸 師為 在上 常不 行已 與空 不求 係的 立為 罷了 滅則 此四 所繫 在菩 把他 一貫 得定 前進 煌本 本行 見性 違反 的好 業果 名曰 不落 仰的 的推 那不 法樂 而流 聞思 行之 而存 是超 能受 形容 是異 細心 乘是 分明 定而 絺羅 有八 之心 律師 的興 求那 界所 有去 如所 斷滅 善解 說它 佛及 切行 契入 側重 史料 道而 相信 常人 我空 種法 從不 何處 樓那 僅有 字的 把它 福報 神我 止的 異我 二字 淵源 足的 一派 他作 苦迫 非佛 於說 的住 佛制 的編 藏菩 為現 肯定 二義 一名 說十 國四 以人 體是 就這 如意 他方 四月 身是 要依 與神 能隨 尸羅 思量 一傳 以四 眾緣 此識 處說 義譯 重心 老的 但他 有七 那個 心要 發出 不僅 與現 彼無 支謙 印順 提的 風格 失了 為汝 觀世 四攝 偏於 能依 儒者 也稱 中也 深信 師以 受苦 部與 保存 不堪 人為 來如 的那 道者 原是 是值 脫道 部師 生界 座起 中不 不安 見而 行菩 攝取 妙音 不對 祇劫 雜誦 住毘 的常 就無 採用 之後 一層 牧師 經為 等說 一如 力故 實自 集為 的妙 不多 我從 告訴 鬘經 正常 一起 中華 在眾 果是 諸善 別心 解了 多有 從現 佛塔 這只 自說 尋求 捨離 方淨 誦本 應如 戒行 無義 真我 論文 應不 學中 那些 在阿 心住 除去 間有 快樂 已得 的平 上是 能起 蘊相 於天 說之 從他 剛經 代佛 以真 法忍 活的 開了 是種 的制 前五 色不 教與 本書 心裡 習慣 緣境 有處 是共 到無 學菩 解佛 回來 人事 學法 授記 來越 不分 色無 相成 以色 行動 隨緣 法都 道出 無垢 已知 持律 不因 是言 佛功 典中 便的 部是 那的 定不 但如 求法 末了 是更 德法 擇滅 不致 有經 身不 有苦 集中 為勝 四眾 於印 所熏 都要 是聲 限的 諦聽 且是 近的 特質 中之 種智 妙的 兩個 原來 的遺 本意 言的 是時 禮而 即佛 為出 對我 耶見 來中 大都 不行 闍世 裡面 大阿 佛會 的般 神足 失譯 立三 十萬 乘聖 悲惱 享受 我論 利根 達成 嚴密 識有 是發 離貪 經分 寫作 部阿 能達 親的 婆蹉 論理 大大 在心 者與 法眼 施的 半月 眼等 三業 民間 是前 幻如 引述 為此 土中 或稱 生相 苦果 嚴格 人來 荷澤 能信 這即 含義 不具 身相 以信 去未 生理 實法 有者 求生 離言 相與 通過 以對 常樂 句話 歷程 基本 喻經 分離 導師 相無 正業 善思 就得 的去 師如 法滅 說菩 摩尼 已說 上有 去看 以明 四卷 的後 內的 羅延 天女 此心 從生 謂諸 利利 於意 問佛 汝今 一阿 異門 說生 稱讚 護譯 即心 一相 若人 勸請 便說 靜的 多比 在僧 學會 行與 彌山 十大 乘中 地上 決擇 天乘 與涅 白的 的應 越來 建築 說波 當前 伽學 是方 產生 成分 晨朝 事不 那律 六日 慧可 其義 露味 諸惡 看法 七寶 此世 能通 推求 二人 二章 明住 在經 中出 行品 福樂 在他 十法 得正 王傳 天帝 有同 論法 別而 常論 密教 切苦 是被 奘所 國民 已成 追求 有邊 欲求 大力 以又 為在 心經 可愛 在王 足論 以現 緣有 直接 其次 教人 年少 以阿 麼也 烏仗 滅不 知足 行果 彼所 本缺 對這 上品 修身 足戒 雖也 利語 妄的 所感 後二 這還 有別 覺者 的加 三性 的年 是錯 殊說 乘所 法得 後人 後生 餘年 去生 是了 義淨 是完 眼觸 然要 在所 之成 相通 中得 諦中 他為 藏為 遊記 得般 而向 三百 貫通 分裂 跋耆 的七 等相 立了 確有 知諸 知者 於外 退失 起不 得見 中邊 仗那 得安 不通 種姓 階級 本所 此處 別故 自成 提樹 法生 八識 漏法 部等 的反 界相 要為 化之 訶男 眼根 不就 合起 的梵 衣鉢 只說 說來 少的 聯合 自力 不減 為重 是慧 造論 這當 像的 以論 常是 山的 過分 也在 給以 波陀 種族 真能 入了 故無 依因 於緣 就應 的八 別者 事分 七識 二處 等五 彼法 說戒 果德 妄念 而只 為比 語的 簡單 以智 死亡 有天 修梵 得此 性中 是存 釋氏 入正 佛傳 愛欲 於經 乘教 佛事 王所 十歲 波旬 淨觀 妙有 滅了 寶藏 九日 汝說 應時 在法 衛城 從上 破除 與道 的資 見聞 滅後 證真 舊有 聽到 應修 說心 也曾 為能 佛有 拘絺 五受 元五 實觀 愛的 無故 見如 生極 為學 叉分 的建 不犯 的偈 這因 墮惡 演說 與本 我者 惟有 當於 遇到 與諸 二日 生說 正語 舍那 希求 財富 總攝 相離 曇摩 轉輪 到成 修止 發大 梵文 應機 執性 導的 身分 諸所 學校 們說 生自 寰遊 讚佛 人乘 是惡 有利 化了 就因 因明 雜心 因中 有修 此下 與律 責任 存有 大士 不即 年間 得很 善女 竟解 這類 犯了 顯了 七覺 而知 得究 清辨 以見 薩發 國際 為斷 大樹 自宗 若能 相分 富樓 增加 距離 黎耶 另有 五世 中是 後夜 時時 於善 安心 覺到 二支 以五 德相 文學 分法 上生 勝過 長的 八地 處理 依相 他力 的慧 本質 興盛 識之 的以 固然 說人 所為 書的 數人 法依 佛乘 說本 等流 定說 藏是 藏之 緊那 得智 月二 有得 的非 僧的 品的 信行 也無 忍辱 執取 現見 而對 不亂 化導 全相 如真 訶薩 提流 的全 八界 學道 身為 而傳 許是 何故 持鉢 不礙 感的 的崇 薩修 是著 是論 補充 國文 義中 智所 法修 見諸 而上 作不 治的 的印 正藏 的類 學生 律中 生善 計執 室利 偷羅 法即 知苦 極端 為僧 為究 於身 之不 同本 國經 不平 說五 於受 是性 十力 業感 為論 種意 進的 諸外 永久 天天 為經 在初 當下 對他 的引 五祖 修禪 而未 佛涅 學而 勤方 這位 洪州 合掌 並且 薩為 生佛 見所 我就 藥叉 心自 這無 無表 諸煩 佛心 則有 寫了 是的 長養 初是 即成 入中 那生 淨不 大臣 與外 已立 以證 當如 有何 名阿 所沒 主流 說沒 長壽 與後 果相 佛元 此即 攝化 執為 三惡 譯者 的態 法王 一品 多種 實了 詩存 當有 思擇 愛樂 是會 為西 這所 佛時 知所 對方 說自 有事 的政 些是 門中 心意 傳六 逮得 於修 本著 的普 的歸 失敗 心淨 然從 消除 佛種 到那 的看 向大 別相 力所 諸弟 起說 所著 休息 來去 而與 賢行 乘莊 取得 義者 是深 可燃 信徒 生苦 感果 力而 若復 有煩 有問 東南 是部 的執 無意 本起 別法 一無 經歷 海潮 不常 與出 開元 起心 大成 於僧 但依 的愛 著衣 應教 教導 教大 僧事 為多 說般 初分 免有 但對 八萬 中佛 界佛 槃後 有識 有世 說二 如在 羅剎 三項 古譯 道不 展為 觀心 而受 的罪 不肯 講記 時不 薩不 盡諸 從本 是理 本補 利用 至少 人道 性見 名如 改變 平時 不承 探求 離此 密嚴 我亦 生得 率天 學家 起中 確乎 與分 傳中 明為 轉化 明是 羅識 了他 廣律 的敘 健康 毘盧 奢摩 的誤 解除 某種 八聖 三時 得如 顯發 有變 麼呢 為作 心也 稱念 儘管 部譬 推重 是其 餘涅 斯匿 此苦 造業 一剎 謂無 而證 三卷 你們 融合 如彼 生厭 有從 如的 著作 是證 的各 日常 嚴淨 聖王 於菩 觀想 的釋 為名 此間 符合 師是 上下 的舊 執持 有神 來為 一旦 安慰 時諸 世王 化中 在南 左右 經集 了說 引的 一頌 來界 的護 得清 表了 若說 起於 薩法 竟無 別體 既然 晉譯 隨機 入道 多說 從初 三千 四方 別異 是滅 丘僧 迦族 指導 禪觀 的領 輕安 要修 但大 僧制 大弟 大空 子系 語文 律部 起與 根身 不屬 執的 生本 專精 境而 即如 定力 合法 薩有 衣持 吉祥 向善 能完 德性 是引 翻譯 麼能 不限 相攝 同而 隨法 利養 善不 摩偷 動機 心說 諦是 受熏 本沒 身命 的稱 這本 勝的 而安 迷信 卷中 衣食 七月 不忍 使是 天所 海中 輕視 地中 信念 的指 摩呾 答曰 誦的 法可 有罪 使眾 知其 究佛 理迦 世出 波利 正統 世之 增廣 以得 是戒 現身 少不 最重 易法 以作 依世 譯義 的當 生即 的歷 是個 由自 簡稱 的外 靜處 增不 餘的 可為 到不 斷故 泰國 有在 對人 致相 佛智 標準 展到 使用 大梵 業是 有功 的著 年前 熾然 有特 視的 聞學 豈不 在五 用了 一則 增進 是明 是僧 是住 於南 道經 是義 著想 依心 的工 即得 不好 七地 令其 入定 最好 印的 為分 際上 多方 既不 帝須 離相 間是 經義 薩藏 果法 斷了 羅經 觸生 不違 是將 麼會 中含 身觀 隨其 心如 善趣 的願 想而 些不 領受 百十 增益 堅定 魔波 敬禮 匿王 界無 薩摩 是定 蜜菩 體證 赤銅 教為 是破 槃寂 空法 槃是 去時 立刻 為解 上正 而解 八法 禪經 已斷 福田 界等 派分 心體 起自 就與 到四 受想 勝妙 根的 離苦 修集 而求 大論 但由 大心 戒學 在北 為同 者有 而被 落於 心善 二千 知如 與聲 惡魔 史上 以十 的機 驗的 音樂 又於 的摩 攝心 立於 而從 有中 身而 名之 緣不 生彼 慧為 是直 滅度 越的 常識 淫欲 是絕 空論 禪思 事緣 局限 多人 不止 四千 生等 前面 以求 與三 觀論 正如 淨相 文所 報的 法海 常生 即由 了菩 微塵 去觀 的合 救度 南無 行位 談到 而要 有限 圓融 忘失 孔子 是淨 此時 等四 已不 僧裝 身語 外空 三系 意云 盡定 法傳 即名 不等 滅是 為對 為例 格的 好處 心三 意味 樹菩 與緣 若為 主觀 無比 力士 他自 還能 誓願 修心 通稱 但沒 切處 流的 但我 盡的 說六 在傳 有傳 一邊 容的 的顯 斷盡 闡明 道了 隨意 不入 編為 聞弟 本於 我自 寂的 忽然 是圓 利塔 我沒 傳燈 是指 觀自 想定 中來 救護 回到 鬥爭 體而 從三 昧的 得三 化人 時空 規定 為天 的演 內部 如其 為常 經師 來就 音菩 經序 觀行 子聞 為涅 說在 無欲 特有 所重 包含 是文 得出 修得 論上 那跋 福嚴 各派 妄唯 處經 重信 從有 由的 種類 飲光 他有 的王 何而 覺經 欲令 簡要 苦聖 們要 懷念 識生 此則 愚夫 教師 有離 年頃 有依 無佛 的物 的欲 奧義 頓悟 法教 諸世 無滅 卷本 不想 依大 行滅 一代 聞正 紀念 以依 切境 而還 是稱 到自 境中 界而 們是 那含 不念 與慧 反的 參訪 之而 解為 燈錄 願的 夜時 法蘊 義有 藏傳 心定 無見 程度 悟解 說因 到後 塔的 提道 略的 漏心 區域 戰爭 法已 是此 若見 間佛 講經 趙宋 以知 我已 咒術 所分 苦受 非色 提倡 論本 璃光 續明 有沒 千世 上瑜 即依 之以 攝的 詳細 發表 城乞 眾說 古老 大義 然會 種差 以表 此諸 大類 三結 假立 非心 四事 所的 即可 新生 在因 于闐 前說 而這 為理 耶雜 阿黎 向外 我而 毘陀 八月 相心 的起 上去 諸經 恢復 的決 呵責 皆得 獨到 有淨 傳記 呾理 定能 於過 起有 想處 摩禪 的延 一地 太陽 摩西 由他 目中 心清 證淨 五門 次的 八眾 四世 經行 師在 佛德 完整 消失 宣揚 尼佛 麼意 是煩 能分 死輪 遮那 雜的 有取 藏所 因的 能攝 與四 不來 離煩 阿利 術語 派所 學術 死而 切如 集團 意觸 百比 種說 難可 始的 去修 走上 聞行 何法 完善 妙欽 成功 等是 宋譯 有阿 起相 以種 相即 為雜 識家 督教 太子 身壞 集者 陀行 誤作 體與 正勤 終時 包括 阿陀 陀跋 立在 系之 土法 項目 含攝 大意 同類 的就 記別 的與 切實 永不 獨存 麼要 是八 告婆 經與 長安 此以 何有 見世 從人 論而 玄學 集法 謂如 敬供 此等 娑婆 非人 說修 稱歎 教而 請佛 你的 改革 而表 這對 去說 因地 的寂 眼見 在四 即生 定境 都從 大覺 起時 還可 大種 記憶 的從 性所 如生 提分 四百 界有 識相 三節 處是 系統 修觀 介紹 尼的 求得 最清 條理 所畏 古德 達了 道為 乘者 的極 以出 到十 際的 於因 要義 是好 不死 王統 智力 的創 超過 充實 可作 修四 臺北 制戒 與僧 戒而 於北 正等 他在 探究 業相 展開 受報 是年 家都 唯物 虛偽 救世 不究 但與 更無 墮地 此滅 十事 痛的 失的 陷於 趣的 太多 系中 到此 斷惑 動物 實而 乘與 乘寶 意欲 初果 原作 天相 考證 名法 丘說 為彼 有想 大流 相中 如三 見已 子而 三佛 書與 相承 轉生 有常 諸上 明菩 使佛 計我 是純 女的 餘人 初禪 型的 要我 開法 大了 不適 達的 養成 部以 部之 隆盛 修所 組合 義來 第九 在性 陀寺 學說 百餘 所認 佛子 皆不 了三 化他 嚴論 很大 的轉 而使 臨終 生到 勇猛 身上 以發 依人 起源 犍陀 負責 非自 是龍 有定 悟真 大千 無得 以本 依正 必定 聚集 識也 忉利 摩那 證實 華的 之真 依中 為教 佛地 別傳 說世 生性 不息 弗言 信者 金銀 院的 執受 示教 受佛 導者 所出 去法 定與 是雜 支持 念法 單是 三身 的攝 迦毘 界性 到阿 良好 成無 定性 門人 如為 是專 團體 圓覺 是於 五乘 何因 又從 隨煩 覺天 晉竺 染心 以理 的離 求解 就稱 統治 有現 熱心 與印 智是 耶的 來出 幸福 叢林 味論 摩提 四說 擇分 為清 心目 失法 的讚 漢果 依之 性淨 空之 團中 識說 子是 共論 而更 明緣 會引 於涅 生公 在地 體裁 他性 若離 同了 略為 有來 蘊的 疾病 天地 以神 及大 婆耆 謂有 數是 結束 時說 假施 觀空 合相 教思 道次 才可 種方 諦譯 五月 諸識 請求 最大 意業 性自 伽婆 派中 諸苦 說所 喻說 作法 及佛 合作 妙雲 浮提 羅夷 由三 有解 永恆 欲而 於出 下生 引經 一異 佛聞 慧力 不遠 四類 能感 是禪 的呢 西南 記載 行集 已滅 以釋 住者 為明 會議 欲為 生喜 法在 從何 二的 國古 隨念 近善 為離 福利 佛語 暫時 象徵 依自 成其 段的 為煩 得這 了人 識上 即自 民眾 四緣 是必 極重 藥事 級的 貪著 義書 訪記 與十 及無 物欲 用這 當作 摩他 論事 用身 之意 豐富 是作 在當 有本 數量 淨行 正說 止息 教以 動亂 實人 之世 有幾 家學 若現 能沒 恩愛 要經 傳戒 上首 俱行 開顯 而開 今生 論與 與西 盧遮 祕密 是攝 示出 家與 這五 梨耶 主宰 起滅 心菩 有染 說真 以觀 或名 離惡 傳到 好了 能現 成不 法從 無事 的責 義與 廣泛 第的 下文 八種 神話 破戒 的師 唯名 得真 身無 的改 塔寺 如自 大雲 悲的 人能 而深 組成 佔有 元六 個時 之行 報身 的供 生惡 到中 講說 習而 義上 本覺 一偈 然依 利天 空故 全不 尊婆 都依 覺音 有道 在後 無緣 上力 罪業 為定 地說 齋戒 著自 再來 但到 關聯 一門 世音 禪門 何能 佛剎 始來 這有 因行 合了 消滅 二品 事而 據的 能徹 本而 得非 所學 一流 二事 軌範 生種 非真 拘薩 惑亂 得其 苦諦 迅速 如心 中見 詰經 一境 的幻 陳那 地品 此可 諦所 廈門 會通 與智 的破 無聞 眾所 界為 斷見 依不 器界 尼戒 妄識 甚麼 家所 獨覺 在論 有增 招感 皆無 起貪 無染 故知 習所 而心 順世 立名 崇拜 佛無 種無 聞者 從空 而歸 形而 執我 集聖 忍的 的希 證無 山中 壽經 婆藪 本具 幫助 山部 為成 體用 能性 此論 為證 為從 與所 是誰 五趣 如修 跡聖 所宗 這時 律者 資料 修法 知無 迦羅 受滅 雲經 來源 來表 道之 子不 業所 是合 彼滅 一實 洛陽 在未 切經 攝事 慧而 行所 大莊 得於 已過 行成 應是 起諸 謂此 萬四 如性 普及 在東 泛的 有行 尊是 法蓮 才會 然無 起煩 動搖 跋摩 業而 揚佛 八大 與文 可通 見其 能安 來成 成道 滅聖 有更 略了 以緣 用不 曼殊 寫的 法融 黃梅 一章 來臺 而重 容色 念是 真性 兄弟 佛就 座系 之集 草木 上慢 是覺 集會 家修 習近 是繼 名目 妙用 是想 藏教 缺少 度教 六界 相生 順法 四品 違犯 緣無 惱而 是長 注釋 月稱 學人 從法 不加 少欲 會之 問分 依而 從種 到三 富有 真誠 離念 在部 一有 生因 見真 無讖 是變 由無 經者 切事 能出 間所 可從 攀緣 當得 見無 會說 為慧 設論 貪愛 別性 真空 學與 的弘 期間 織的 識滅 出席 常有 古說 承受 理而 實證 機的 滅除 興趣 為信 吾人 化生 規制 己身 幻化 始結 便道 的家 壞命 住而 聖智 為唯 文說 諸聖 無窮 作了 央掘 在如 之前 念相 不徹 止惡 林寺 化度 的邪 我性 慧眼 極大 易的 種人 國三 的滅 可稱 擴展 來智 常故 小戒 的綜 瓔珞 本際 待的 何不 是業 國之 譯經 之分 願生 個世 決了 經常 即見 一論 專重 住無 相為 由彼 了法 法毘 解行 前所 幻的 位中 慢慢 變動 的規 想不 始般 這真 此非 人世 留下 菲律 以應 薩以 然以 同分 利文 寶記 七種 曼陀 華氏 接觸 過經 寶經 地而 可不 順於 此後 予以 與天 論定 三明 確立 共二 裡有 果不 嚴精 殊法 的偉 心於 能善 藏與 總結 淨無 舊傳 伽者 的音 是凡 所發 色為 六觸 凡聖 從修 轉相 健全 色列 面目 日月 的含 體不 憍慢 母親 落的 與解 而達 已是 方世 三個 設的 三有 因生 行故 從經 習成 的某 減少 聰明 羅長 的偏 有對 相者 空觀 一宗 異義 全經 釋提 無人 身與 集起 轉部 空慧 舊譯 對自 意根 是南 我相 蘭的 毀滅 怯弱 三處 新聞 於事 而觀 的習 安慧 病苦 月初 身見 部執 構成 佛相 成正 的眼 是乎 續中 勢力 這正 而言 小的 禪風 二句 名善 代學 年中 都應 老法 然燈 看到 於定 求自 息的 三無 若如 攝頌 著不 言教 不聞 知我 有體 多是 是物 而加 名比 無而 有前 自生 便不 對此 了我 比起 當說 去理 也多 的舍 起之 以推 異相 的高 修無 川彰 果說 此人 適當 無智 穢土 兩部 住了 乘而 的奴 器世 脫離 家之 又問 而稱 律賓 戒定 什公 師傳 十月 為神 亦是 德說 而見 來自 能深 時也 依著 有業 極的 四果 千萬 的恩 與其 得善 之時 內法 來現 提桓 分本 現世 他生 為何 味的 生位 過未 於神 諸相 熟果 未無 為聖 是得 竟苦 安人 法尊 尊在 諸業 念阿 到人 範圍 漢院 何得 唐玄 從眾 七佛 後不 住心 等十 廬山 平川 即從 古義 生眼 常為 悲智 共產 是表 非異 之有 樹論 法去 我對 與弟 的婆 為初 有用 人對 流於 解答 薩本 裡是 未必 避免 問的 以想 的諍 名而 極多 從印 為目 都由 革新 二位 世第 離有 的向 到菩 人們 所念 難說 純正 性身 威力 未成 切唯 塞迦 之類 部本 緣識 說彼 從世 隨所 五說 宗要 在沒 我心 說依 在實 行處 然與 說眾 專修 維護 相現 黑暗 的適 雲集 死與 一千 永盡 戒者 著說 有共 教團 閱拙 網經 傳宗 向的 法名 空三 更深 明不 法等 滅定 裡說 纂集 前四 相見 所公"
},{}],45:[function(require,module,exports){
const fs=require("fs");

const putbilink=function(cor,fieldname) { //put bilink to taisho, return a list of article has bilink
	const fn='link-taisho-yinshun.json';
	if (!fs.existsSync(fn))exit;
	const bilinks=JSON.parse(fs.readFileSync(fn,"utf8"));
	fieldname=bilinks.shift().type;
	var articles={};
	for (var i=0;i<bilinks.length;i++) {
		const bilink=bilinks[i].split("\t");
		var krange=cor.parseRange(bilink[0]).kRange;
		var article=cor.findArticle(krange);
		if (article<0) {
			console.log("invalid address",bilink[0],'filename',fn);
			continue;
		}
		articles[article]=true;
		const value=parseInt(bilink[1],10);
		cor.putArticleField(fieldname,value,krange,article);
	}
	return Object.keys(articles).map(i=>parseInt(i,10)).sort((a,b)=>a-b);
}
module.exports={putbilink};
},{"fs":undefined}],46:[function(require,module,exports){
var _sic,_corr,_orig,_reg;
var choice=function(tag,closing){
	if (closing) {
		this.inChoice=0;
		//console.log(this.vars.sic+"->"+this.vars.corr);
	} else {
		this.inChoice=1;
		_sic=_corr=_orig=_reg="";
	}
}
var sic=function(tag,closing){
	if (closing) {
		_sic=this.popText();
	} else {
		this.inChoice=2;
		return true;//return true if want to capture text
	}
}
var orig=sic;
var corr=function(tag,closing){
	if (closing){
		_corr=this.popText();
		this.addText(_corr);
	} else {
		this.inChoice=3;
		return true;
	}
}
var reg=corr;

module.exports={choice,sic,corr,orig,reg};
},{}],47:[function(require,module,exports){
const CaptureText=true;
const title=function(tag,closing){
	if (tag.attributes.level) return ;//prevent duplicate title
	if (this.started)return;//only process title before body
	if (closing) {
		const t=this.popText();
		if (t) this.putField("head","1."+t);
	} else return CaptureText;
}
var div0kpos=1;// kpos of top level div (as article
var headkpos=1;//kpos of begining of head
var divdepth=0;

const head=function(tag,closing) {
	if (divdepth<1)return;
	if (divdepth===1 && closing) {
		this.putArticle(this.peekText());
	}
	return this.handlers.head_subtree.call(this,tag,closing,divdepth);
}

const div=function(tag,closing) {
	if (closing) {
		divdepth--;
	} else {
		if (divdepth==0) {
			div0kpos=this.kPos;
		}
		divdepth++;
	}
}

const divfinalize=function(){
	this.handlers.head_subtree_finalize.call(this);
}
const collection=function(tag){
	this.putField("toc","1\t"+tag.attributes.label);
}
const articlegroup=function(tag){
	this.putField("toc","2\t"+tag.attributes.label);
	this.putGroup(tag.attributes.label);
}

module.exports={div,title,collection,articlegroup,head,divfinalize};
},{}],48:[function(require,module,exports){
var gid="";
var eudc=[];
const CaptureText=true;
const char=function(tag,closing){
	const id=tag.attributes["xml:id"];
	gid=id;
}
const g=function(tag,closing){
	const exp=eudc[tag.attributes.ref.substr(1)];
	if (exp) this.addText(exp);
}
const mapping=function(tag,closing){
	if (closing) {
		const exp=this.popText();
		eudc[gid]=exp;
	} else {
		this.popText();
		return CaptureText;
	}
}
module.exports={char,g,mapping};
},{}],49:[function(require,module,exports){
const buildfilelist=function(maxfile){
	var files=[];
	//y00 missing lb tag before pb=54
	maxfile=maxfile||42;
	for(var i=1;i<=maxfile;i++)	{
		var n="0"+i;
		n=n.substr(n.length-2);
		files.push("y"+ n+".xml");
	}
	//files.push("appendix.xml");
	return files;
};

module.exports=buildfilelist;
},{}],50:[function(require,module,exports){
var inlist=false;

var lb=function(tag){
	this.handlers.lb_page_line.call(this,tag);
}

const p=function(tag){
	this.putEmptyBookField("p");	
}
const item=function(tag,closing){
	if (!closing && inlist) {
		this.putEmptyBookField("p");
	}
}
const list=function(tag,closing){
	inlist=!closing;
}
module.exports={lb,list,p,item};
},{}],51:[function(require,module,exports){
const {createCorpus}=require("ksana-corpus-builder");
const fs=require("fs");
const sourcepath="xml/";
const maxfile=0;
var files=require("./filelist")(maxfile);
//for (var i=0;i<39;i++) files.shift();
//files.length=1;
const bilink=require("./bilink");

const bookStart=function(){
	noteReset.call(this);
}
const bookEnd=function(){
}

const body=function(tag,closing){
	closing?this.stop():this.start();
}
const onToken=function(token){
	//console.log(token);
	//return null for stop words
	//return " " for empty token, increase tpos but no inverted is created
	return token;
}

const fileStart=function(fn,i){
	const at=fn.lastIndexOf("/");
	console.log(fn)
	fn=fn.substr(at+1);
	fn=fn.substr(0,fn.length-4);//remove .xml
	var kpos=this.nextLineStart(this.kPos); //this.kPos point to last char of previos file
	this.putField("file",fn,kpos);
}

const bigrams={};

require("./bigrams").split(" ").forEach((bi)=>bigrams[bi]=true);

//build bigram if not exists
const bilinkfield="bilink@taisho";
const linkTo={[bilinkfield]:[]};//list of articles has bilink to taisho, for taisho to build reverse link

var options={name:"yinshun",inputFormat:"xml",bitPat:"yinshun",title:"印順法師佛學著作集",
maxTextStackDepth:3,
articleFields:["ptr","def","note","link","noteid","figure",bilinkfield],
//textOnly:true,
removePunc:true,
linkTo:linkTo,
extrasize:1024*1024*10, //for svg
autostart:false,bigrams}; //set textOnly not to build inverted
var corpus=createCorpus(options);

const {char,g,mapping}=require("./eudc");
const {div,collection,articlegroup,head,title,divfinalize}=require("./div");
const {p,lb,list,item}=require("./format");
const {note,ptr,ref,noteReset,notefinalize}=require("./note");
const {choice,sic,corr,orig,reg}=require("./choice");
const {graphic,figure}=require("./graphic");


const finalize=function(){
	divfinalize.call(this);
	notefinalize.call(this);
	linkTo[bilinkfield]=bilink.putbilink(this,bilinkfield);
}
corpus.setHandlers(
	//open tag handlers
	{body,list,item,div,collection,articlegroup,p,lb,title,head,mapping,char,g,note,
		choice,corr,sic,orig,reg,ptr,ref,graphic,figure}, 
	//end tag handlers
	{body,list,div,head,title,mapping,char,note,
		choice,corr,sic,orig,reg,ref,figure}, 
	//other handlers
	{bookStart,bookEnd,onToken,fileStart,finalize}  
);

files.forEach(fn=>corpus.addFile(sourcepath+fn));

corpus.writeKDB("yinshun.cor",function(byteswritten){
	console.log(byteswritten,"bytes written")
});

console.log(corpus.totalPosting,corpus.tPos);
},{"./bigrams":44,"./bilink":45,"./choice":46,"./div":47,"./eudc":48,"./filelist":49,"./format":50,"./graphic":52,"./note":53,"fs":undefined,"ksana-corpus-builder":6}],52:[function(require,module,exports){
const fs=require("fs");
var svgcontent="";
const graphic=function(tag){
	const url=tag.attributes.url;
	const fn="svg/"+url.substr(0,3)+'/'+url;
	
	if (fs.existsSync(fn)) {
		svgcontent=fs.readFileSync(fn,"utf8");
	} else {
		svgcontent="";
		console.log("error loading svg",fn)
	}
}
var figurestartkpos=0;
const figure=function(tag,isclosing){
	if (isclosing) {
		if (svgcontent) {
			const kpos=this.kPos;//to cover all character including
			this.putArticleField("figure", svgcontent , this.makeKRange(figurestartkpos,kpos));
		}
	} else {
		figurestartkpos=this.kPos;
	}
}
module.exports={graphic,figure}
},{"fs":undefined}],53:[function(require,module,exports){
//正文內的腳注號<ptr type="note" target="id",
var noteid={};
const CaptureText=true;
const Ref=require("./ref");
var refKPos=0; //kpos of <ref>
var defKPos=0; //kpos of <def>
var ptr_id="";
var ptr=function(tag){ //foot note marker in maintext, point to <note xml:id>
	if (tag.attributes.type==="note"){
		var nid=tag.attributes.target;//注釋號
		if (nid){
			const id=nid.substr(5);
			if (this.inChoice==2) return; //ignore sic and orig

			if (noteid[id]) {
				if (typeof noteid[id]=="object") {
					noteid[id].push(this.kPos);
				} else {
			//701.12 in y36.xml note id126.002
					console.warn("note",nid,"has more than one ptr");
					noteid[id]=[noteid[id],this.kPos];
				}
			} else {
				noteid[id]=this.kPos;				
			}
		}
	}
}

//章或節結束前的注釋群  連到注釋號 <note xml:id="id">
//id 只為了找回 ptr 的 kpos
var def=function(id,defkrange){
	var notekpos=noteid[id];
	if (typeof notekpos==="undefined"){
		console.error("def without ptr, xmlid:",id);
		return;
	} else {
		if (typeof notekpos=="number"){
			this.putArticleField("ptr",defkrange,notekpos);
			this.putArticleField("def",notekpos,defKPos);
			this.putArticleField("noteid",id);
		} else {
			notekpos.forEach(function(p){
				this.putArticleField("ptr",defkrange,p)}.bind(this)
			);
			notekpos.forEach(function(p){
				this.putArticleField("def",p,defKPos)}.bind(this)
			);
			notekpos.forEach(function(){
				this.putArticleField("noteid",id)
			})
		}
	}
	//might have negative value
}

const cbetareg=/CBETA, ?T(\d+), ?no\. ?\d+[A-Za-z]?, ?p\. ?(\d+), ?([abc]\d+)/
var linktotaisho=[];
const addtaisholink=function(taishoaddress,kpos,id){
	if (typeof kpos!=="number") {
		console.error("multi kpos of taishoaddress");
	}
	linktotaisho.push([kpos,taishoaddress]);
}
const parseCBETA=function(str,kpos){
	var m=str.match(cbetareg);
	if (m) {
		var v=m[1];
		if (v.charAt(0)=="0") v=v.substr(1);
		var link=v+"p"+m[2]+m[3];
		addtaisholink(link,kpos);
	}
}
const targetreg=/vol:(\d+);page:(p\d+[abc])/
const parseTaishoTarget=function(target,kpos){
	var m=target.match(targetreg);
	if (m) {
		addtaisholink(m[1]+m[2],kpos);
	} else {
		console.error("error taisho target",target);
	}
}
const notefinalize=function(){
	linktotaisho.sort((a,b)=>a[0]-b[0]);
	const pos=linktotaisho.map(item=>item[0] );
	const value=linktotaisho.map(item=>item[1] );
	require("fs").writeFileSync("linktotaisho.js",'module.exports={'+
		'pos:'+JSON.stringify(pos)+
		'\n,value:'+JSON.stringify(value)+
		'};',"utf8");
	linktotaisho=[];
}
var note=function(tag,closing){ //note cannot be nested.
	if (tag.attributes.type=="editorial")return;
	var xmlid=tag.attributes["xml:id"];
	if (xmlid) {
		if (closing) { //closing a note in note group
			var krange=this.makeKRange(defKPos,this.kPos);
			def.call(this,xmlid.substr(4),krange);
			defKPos=0;
		} else {//keep the starting kpos of <note>
			ptr_id=xmlid.substr(4);
			defKPos=this.kPos;
		}
	} else { 
		if (tag.attributes["place"]=="inline2") {
				//inline note (夾注)
		} else {
			if (closing) { //inline note
				const t=this.popText();
				parseCBETA(t,this.kPos);
				t&&this.putArticleField("note",t);
			} else {  //capture the text
				return CaptureText;
			}			
		}
	}
}

var noteReset=function(){
	noteid={};
}


var ref=function(tag,closing){ //link to taisho or taixu
	if (tag.isSelfClosing) {
		const krange=this.makeKRange(this.kPos,this.kPos);
		const target=tag.attributes.target;
		if (tag.attributes.type==="taisho") {
			var kpos=this.kPos;
			if (defKPos) { //ref inside <note xml:id> </note> , use ptr as kpos
				kpos=noteid[ptr_id];
			}
			parseTaishoTarget(target,kpos);
		}
		Ref.parse.call(this,tag.attributes.type,target,krange);
	} else {
		if (closing) {
			const krange=this.makeKRange(refKPos,this.kPos);
			const target=tag.attributes.target;

			if (tag.attributes.type==="taisho") {
				var kpos=this.kPos;
				if (defKPos) { //ref inside <note xml:id> </note> , use ptr as kpos
					kpos=noteid[ptr_id];
				}
				parseTaishoTarget(target,kpos);
			}
			Ref.parse.call(this,tag.attributes.type,target,krange);
		} else {		
			refKPos=this.kPos;
		}		
	}
}

module.exports={note,ptr,ref,noteReset,notefinalize};
},{"./ref":54,"fs":undefined}],54:[function(require,module,exports){
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
	}

	const link=(type=="Taisho")?m[1]:m[1]+"p"+m[2]+(m[3]||"");

	this.putArticleField("link",type+"@"+link,kpos);
}
module.exports={parse};
},{}]},{},[51]);
