/**
 * Authored function-word dictionary and irregular forms for the rule engine.
 * The list covers high-frequency words (approx. top-300 general service words
 * plus common inflections). It is deliberately incomplete: the checker must
 * stay honest for out-of-dictionary content.
 */

export const COMMON_WORDS: string[] = [
  'a','about','above','actor','actress','add','after','again','against','age','ago',
  'always','am','an','and','angry','animal','annoyed','another','answer','any','anyone',
  'apples','are','arm','around','arrive','as','ask','at','ate','aunt','away','baby','back',
  'bad','bag','banana','basketball','be','beautiful','become','been','before','begin',
  'behind','believe','belong','best','better','between','bird','black','blue','board','body',
  'book','both','bottle','boy','bread','break','breakfast','bring','brother','brown','build',
  'busy','but','buy','by','call','came','can','car','care','carry','cat','catch','change',
  'child','children','city','class','clean','clear','close','cold','colleague','colour',
  'come','company','computer','correct','cost','could','country','course','cousin','cover',
  'cricket','cry','cut','dance','daughter','day','deep','did','different','difficult','dinner',
  'district','do','doctor','does','dog','doing','done','door','down','draw','dream','drink',
  'drive','drop','during','each','ear','early','eat','egg','eight','either','eldest','email',
  'end','english','enjoy','enough','enter','even','evening','every','everyone','everything',
  'example','explain','eye','face','fact','fail','fair','fall','family','far','farm','fast',
  'father','feel','feet','few','fight','fill','film','find','fine','finish','fire','first',
  'fish','five','flat','fly','follow','food','foot','for','forget','four','free','fresh',
  'friend','from','front','full','fun','game','garden','gave','general','generous','get',
  'girl','give','go','goes','gone','good','grade','grandfather','grandmother','great','green',
  'ground','grow','had','hair','half','hand','happen','happy','hard','has','hate','have',
  'he','head','hear','heart','heavy','hello','help','her','here','high','him','his',
  'history','hold','home','hope','horse','hospital','hot','hotel','hour','house','how',
  'however','hundred','hungry','hurry','i','ice','idea','if','ill','important','in','inside',
  'interesting','internet','into','introduce','is','it','its','job','join','journey','joy',
  'just','keep','key','kind','kite','knew','know','lake','language','large','last','late',
  'laugh','lazy','lead','learn','leave','left','leg','less','lesson','let','letter','library',
  'lie','life','light','like','line','lion','listen','little','live','local','long','look',
  'lose','lost','lot','loud','love','low','lunch','machine','made','make','man','many','map',
  'market','marry','match','matter','may','maybe','me','meal','mean','meet','metre','mind',
  'minute','miss','mistake','modern','moment','monday','money','month','moon','more','morning',
  'most','mother','mountain','mouth','move','much','music','must','my','myself','name','near',
  'nearly','need','never','new','news','next','nice','night','nine','no','nobody','noise',
  'noon','north','not','note','nothing','now','number','nurse','o’clock','of','off','offer',
  'office','often','oil','old','on','once','one','only','open','opposite','or','orange',
  'order','other','our','out','outside','over','own','page','paint','paper','pair','part',
  'pass','past','pay','people','perhaps','person','phone','photo','piano','picture','piece',
  'pink','place','plan','plane','plant','play','please','pocket','point','police','poor',
  'possible','post','practice','prefer','prepare','present','president','pretty','print',
  'problem','promise','put','question','quick','quiet','rain','rather','read','ready','real',
  'receive','record','red','remember','repair','reply','rest','restaurant','return','rich',
  'right','ring','river','road','room','round','run','sad','safe','said','same','saturday',
  'say','school','sea','seat','second','secret','see','seem','sell','send','sentence','serious',
  'seven','share','she','short','should','show','side','sign','silly','similar','since','sing',
  'sister','sit','six','sky','sleep','slow','small','smell','smile','snow','so','some','somebody',
  'someone','something','sometimes','son','soon','sorry','sound','south','speak','special',
  'spend',  'sport','spring','start','station','stay','still','stop','store','story','street',
  'strong','student','study','subject','such','sudden','summer','sun','sunday','supper','sure',
  'sweet','swim','table','take','talk','tall','teacher','team','television','tell','ten','test',
  'than','thank','that','the','their','them','then','there','these','they','thick','thin',
  'thing','think','third','this','those','though','thought','three','through','throw','thursday',
  'time','tiny','tired','to','today','together','tomorrow','tonight','too','took','top','touch',
  'town','train','travel','tree','trip','true','try','tuesday','turn','two','uncle','under',
  'understand','until','up','us','use','useful','usually','very','village','visit','voice',
  'wait','wake','walk','wall','want','war','warm','wash','watch','water','way','we','weak',
  'wear','weather','wednesday','week','well','went','were','west','wet','what','wheel','when',
  'where','which','while','white','who','whole','why','wide','wife','will','win','window',
  'winter','wish','with','within','without','woman','women','wonder','wood','word','work',
  'world','would','write','wrong','yard','year','yellow','yes','yesterday','yet','you','young',
  'your','yourself',
];

export const IRREGULAR_PAST: Record<string, string> = {
  be: 'was/were', become: 'became', begin: 'began', break: 'broke', bring: 'brought',
  build: 'built', buy: 'bought', catch: 'caught', choose: 'chose', come: 'came',
  cost: 'cost', cut: 'cut', do: 'did', draw: 'drew', drink: 'drank', drive: 'drove',
  eat: 'ate', fall: 'fell', feed: 'fed', feel: 'felt', fight: 'fought', find: 'found',
  fly: 'flew', forget: 'forgot', get: 'got', give: 'gave', go: 'went', grow: 'grew',
  have: 'had', hear: 'heard', hold: 'held', keep: 'kept', know: 'knew', led: 'led',
  leave: 'left', lend: 'lent', lose: 'lost', make: 'made', mean: 'meant', meet: 'met',
  pay: 'paid', put: 'put', read: 'read', ride: 'rode', ring: 'rang', rise: 'rose',
  run: 'ran', say: 'said', see: 'saw', sell: 'sold', send: 'sent', sing: 'sang',
  sit: 'sat', sleep: 'slept', speak: 'spoke', spend: 'spent', swim: 'swam',
  take: 'took', teach: 'taught', tell: 'told', think: 'thought', throw: 'threw',
  understand: 'understood', wake: 'woke', wear: 'wore', win: 'won', write: 'wrote',
};

/** verb base word for each past-excepted nounless common irregulars */
export const IRREGULAR_PAST_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(IRREGULAR_PAST)
    .filter(([k]) => k !== 'led')
    .flatMap(([base, past]) => past.split('/').map((p) => [p, base])),
);

export const THIRD_SINGULAR_VERBS: Set<string> = new Set([
  'goes', 'comes', 'does', 'makes', 'takes', 'gives', 'knows', 'says', 'thinks',
  'wants', 'likes', 'needs', 'looks', 'works', 'plays', 'helps', 'reads', 'writes',
  'speaks', 'learns', 'stays', 'stops', 'sits', 'runs', 'eats', 'drinks', 'sleeps',
  'watches', 'washes', 'teaches', 'studies', 'carries', 'buys', 'sends', 'tells',
  'asks', 'answers', 'opens', 'starts', 'meets', 'listens', 'hopes',
  'kisses', 'catches', 'finishes', 'lives', 'loves', 'hates', 'shows', 'means',
  'feels', 'finds', 'understands', 'brings', 'tries', 'passes', 'uses',
]);

export const SVA_ALLOWED_BASE_AFTER_3RD: Set<string> = new Set([
  'is', 'has', 'was', // correct 3rd-singular forms
]);
