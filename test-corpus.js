const {openCorpus}=require("ksana-corpus");

const engineReady=function(engine){
	engine.get(["texts",0,0],function(s){
		console.log(s)	
	});
}

openCorpus("yinshun",function(err,engine){
	if (err) console.log(err);
	else engineReady(engine);
});