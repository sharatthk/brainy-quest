// English lessons and quizzes. Original content covering core grade 3-6 language arts topics.
// Question types:
//   mc:   { t:'mc', q, c:[choices], a:'answer', e:'why', p?:'passage' }
//   tap:  { t:'tap', q, s:'sentence', a:['words to tap'], e }
//   fill: { t:'fill', q, s:'sentence with ___', a:['accepted answers'], e }

export const ENGLISH_SECTIONS = [
  { id: 'pos', title: 'Parts of Speech', emoji: '🧱' },
  { id: 'sent', title: 'Sentences', emoji: '🧩' },
  { id: 'punct', title: 'Punctuation & Capitals', emoji: '✏️' },
  { id: 'words', title: 'Word Power', emoji: '💪' },
  { id: 'fig', title: 'Figurative Language', emoji: '🎭' },
  { id: 'read', title: 'Reading & Writing', emoji: '📖' },
];

const U = (id, section, title, emoji, lessons, questions) => ({ id, section, title, emoji, lessons, questions });
const L = (title, body) => ({ title, body });

export const ENGLISH_UNITS = [
  // ---------------- Parts of Speech ----------------
  U('nouns', 'pos', 'Nouns', '🏷️', [
    L('What is a noun?', '<p>A <b>noun</b> names a <b>person</b>, <b>place</b>, <b>thing</b>, or <b>idea</b>.</p><ul><li>Person: <i>teacher, sister, Mia</i></li><li>Place: <i>park, kitchen, Japan</i></li><li>Thing: <i>pencil, dog, rocket</i></li><li>Idea: <i>happiness, bravery, freedom</i></li></ul><p class="tip">Test: can you put <b>"the"</b> or <b>"a"</b> in front of it? Then it is probably a noun.</p>'),
    L('Common and proper nouns', '<p>A <b>common noun</b> is a general name: <i>city, girl, river</i>.</p><p>A <b>proper noun</b> is the special name of one person, place, or thing. It always starts with a <b>capital letter</b>: <i>Chicago, Priya, the Nile River, Monday</i>.</p>'),
    L('Plural nouns', '<p><b>Plural</b> means more than one.</p><ul><li>Most nouns add <b>-s</b>: cat → cats</li><li>Ends in s, x, ch, sh: add <b>-es</b>: box → boxes, lunch → lunches</li><li>Consonant + y: change y to <b>-ies</b>: baby → babies</li><li>Some are irregular: child → <b>children</b>, mouse → <b>mice</b>, foot → <b>feet</b>, tooth → <b>teeth</b></li></ul>'),
  ], [
    { t: 'tap', q: 'Tap every noun.', s: 'The girl put her book on the table.', a: ['girl', 'book', 'table'], e: 'Girl (person), book (thing) and table (thing) are nouns.' },
    { t: 'tap', q: 'Tap the proper nouns.', s: 'Last summer, Mia visited Canada with her cousin.', a: ['Mia', 'Canada'], e: 'Mia and Canada are special names, so they are proper nouns with capital letters.' },
    { t: 'mc', q: 'Which word is a noun?', c: ['jump', 'quickly', 'garden', 'happy'], a: 'garden', e: 'A garden is a place.' },
    { t: 'mc', q: 'Which noun names an idea?', c: ['bravery', 'bicycle', 'river', 'doctor'], a: 'bravery', e: "You can't touch bravery - it's an idea or feeling." },
    { t: 'mc', q: 'What is the plural of "child"?', c: ['childs', 'childes', 'children', 'childrens'], a: 'children', e: 'Child is irregular: one child, two children.' },
    { t: 'mc', q: 'What is the plural of "berry"?', c: ['berrys', 'berries', 'berryes', 'berrise'], a: 'berries', e: 'Consonant + y: change the y to i and add -es.' },
    { t: 'mc', q: 'Which is a proper noun?', c: ['school', 'Monday', 'dog', 'country'], a: 'Monday', e: 'Days of the week are proper nouns.' },
    { t: 'fill', q: 'Write the plural.', s: 'One fox, two ___.', a: ['foxes'], e: 'Words ending in x add -es.' },
    { t: 'mc', q: 'What is the plural of "mouse"?', c: ['mouses', 'mice', 'mices', 'meese'], a: 'mice', e: 'Mouse is irregular: one mouse, many mice.' },
  ]),
  U('pronouns', 'pos', 'Pronouns', '🙋', [
    L('What is a pronoun?', '<p>A <b>pronoun</b> takes the place of a noun so we don\'t repeat it.</p><p><i>Sam</i> lost <i>Sam\'s</i> hat → <i>Sam</i> lost <b>his</b> hat.</p><p>Common pronouns: <b>I, you, he, she, it, we, they</b>.</p>'),
    L('Subject and object pronouns', '<p><b>Subject</b> pronouns do the action: <b>I, he, she, we, they</b>.</p><p><b>Object</b> pronouns receive the action: <b>me, him, her, us, them</b>.</p><p><i><b>She</b> called <b>him</b>.</i></p><p class="tip">Trick: take away the other person. "Mom and <b>me</b> went" → "<b>Me</b> went"? No! Say "Mom and <b>I</b> went."</p>'),
    L('Possessive pronouns', '<p>These show who owns something: <b>my, your, his, her, its, our, their, mine, yours, ours, theirs</b>.</p><p><i>That bike is <b>mine</b>. <b>Its</b> wheels are new.</i></p>'),
  ], [
    { t: 'tap', q: 'Tap the pronouns.', s: 'She gave him the keys yesterday.', a: ['She', 'him'], e: 'She and him take the place of names.' },
    { t: 'mc', q: 'Choose the correct pronoun: "___ and I built a fort."', c: ['Him', 'He', 'His', 'Them'], a: 'He', e: 'He is a subject pronoun - he is doing the building.' },
    { t: 'mc', q: 'Jake and Lila went home. Which pronoun can replace "Jake and Lila"?', c: ['He', 'She', 'They', 'Us'], a: 'They', e: 'Two people doing the action = they.' },
    { t: 'mc', q: 'The teacher smiled at Sam and ___.', c: ['I', 'me', 'mine', 'my'], a: 'me', e: 'Take away "Sam and": "smiled at me" sounds right.' },
    { t: 'mc', q: 'Which sentence uses a possessive pronoun?', c: ['That bike is mine.', 'I ride a bike.', 'He rides fast.', 'We like bikes.'], a: 'That bike is mine.', e: 'Mine shows who owns the bike.' },
    { t: 'fill', q: 'Fill in the possessive pronoun.', s: 'The cat licked ___ paw.', a: ['its'], e: 'Its (no apostrophe) shows the paw belongs to the cat.' },
    { t: 'mc', q: 'Which is an object pronoun?', c: ['they', 'we', 'us', 'I'], a: 'us', e: 'Us receives the action: "Grandma hugged us."' },
    { t: 'tap', q: 'Tap both possessive pronouns.', s: 'Is this your jacket or mine?', a: ['your', 'mine'], e: 'Your and mine show ownership.' },
  ]),
  U('verbs', 'pos', 'Verbs', '🏃', [
    L('Action verbs', '<p>A <b>verb</b> shows action or being. <b>Action verbs</b> tell what someone does: <i>run, eat, think, giggle, build</i>.</p><p><i>The frog <b>leaped</b> into the pond.</i></p>'),
    L('Linking verbs', '<p><b>Linking verbs</b> connect the subject to a word that describes it: <b>am, is, are, was, were, seem, become, feel</b>.</p><p><i>The soup <b>is</b> hot. I <b>feel</b> sleepy.</i></p>'),
    L('Helping verbs', '<p><b>Helping verbs</b> help the main verb: <b>is, are, was, has, have, had, will, can, should, could, might</b>.</p><p><i>Grandpa <b>has</b> baked cookies. We <b>will</b> swim.</i></p><p class="tip">Use strong verbs! "strolled" paints a better picture than "walked slowly".</p>'),
  ], [
    { t: 'tap', q: 'Tap the action verb.', s: 'The frog leaped into the pond.', a: ['leaped'], e: 'Leaped is what the frog did.' },
    { t: 'tap', q: 'Tap the two verbs.', s: 'We laughed and clapped at the show.', a: ['laughed', 'clapped'], e: 'Both are actions.' },
    { t: 'mc', q: 'Which word is a verb?', c: ['shiny', 'swim', 'under', 'table'], a: 'swim', e: 'Swim is an action.' },
    { t: 'mc', q: 'Find the linking verb: "The soup is hot."', c: ['soup', 'is', 'hot', 'The'], a: 'is', e: 'Is links soup to hot.' },
    { t: 'mc', q: 'In "She will sing tonight," which word is the helping verb?', c: ['She', 'will', 'sing', 'tonight'], a: 'will', e: 'Will helps the main verb sing.' },
    { t: 'mc', q: 'Which sentence has an action verb?', c: ['The sky is blue.', 'Max kicked the ball.', 'I am tired.', 'They were late.'], a: 'Max kicked the ball.', e: 'Kicked is an action. The others use linking verbs.' },
    { t: 'tap', q: 'Tap the helping verb and the main verb.', s: 'Grandpa has baked cookies.', a: ['has', 'baked'], e: 'Has helps the main verb baked.' },
    { t: 'mc', q: 'Which is a stronger verb for "walked slowly"?', c: ['ran', 'strolled', 'jumped', 'shouted'], a: 'strolled', e: 'Strolled means walked slowly and relaxed.' },
  ]),
  U('adjectives', 'pos', 'Adjectives', '🎨', [
    L('Describing words', '<p>An <b>adjective</b> describes a noun. It tells <b>what kind</b>, <b>which one</b>, or <b>how many</b>.</p><p><i>a <b>tiny brown</b> mouse, <b>three</b> puppies, <b>that</b> house</i></p><p>The articles <b>a, an, the</b> are adjectives too. Use <b>an</b> before a vowel sound: <i>an apple, an hour</i>.</p>'),
    L('Comparing', '<p>Compare <b>two</b> things: add <b>-er</b> or use <b>more</b>: <i>taller, more beautiful</i>.</p><p>Compare <b>three or more</b>: add <b>-est</b> or use <b>most</b>: <i>tallest, most beautiful</i>.</p><p>Irregular: good → better → best, bad → worse → worst.</p><p>Short word ending consonant-vowel-consonant? Double it: big → bigger → biggest.</p>'),
  ], [
    { t: 'tap', q: 'Tap the adjectives.', s: 'A tiny brown mouse hid in the old barn.', a: ['tiny', 'brown', 'old'], e: 'Tiny and brown describe the mouse; old describes the barn.' },
    { t: 'mc', q: 'Which word is an adjective?', c: ['fluffy', 'run', 'slowly', 'cloud'], a: 'fluffy', e: 'Fluffy describes what kind.' },
    { t: 'mc', q: 'This box is ___ than that one.', c: ['heavy', 'heavier', 'heaviest', 'more heavy'], a: 'heavier', e: 'Comparing two things: -er.' },
    { t: 'mc', q: 'That was the ___ movie ever!', c: ['good', 'better', 'best', 'goodest'], a: 'best', e: 'Good → better → best.' },
    { t: 'mc', q: 'Which article fits? "I ate ___ apple."', c: ['a', 'an'], a: 'an', e: 'Apple starts with a vowel sound, so use an.' },
    { t: 'mc', q: '"Three" in "three puppies" tells...', c: ['what kind', 'how many', 'which one', 'where'], a: 'how many', e: 'Three tells how many puppies.' },
    { t: 'fill', q: 'Write the superlative of "big".', s: 'An elephant is the ___ animal at the zoo.', a: ['biggest'], e: 'Big → bigger → biggest (double the g).' },
    { t: 'mc', q: 'Which is correct?', c: ['more beautiful', 'beautifuler', 'most beautifuler', 'beautifullest'], a: 'more beautiful', e: 'Long adjectives use more and most.' },
  ]),
  U('adverbs', 'pos', 'Adverbs', '🐢', [
    L('What is an adverb?', '<p>An <b>adverb</b> describes a verb (and sometimes an adjective or another adverb). It tells:</p><ul><li><b>How</b>: quietly, fast, well</li><li><b>When</b>: soon, yesterday, now</li><li><b>Where</b>: outside, here, everywhere</li><li><b>How often</b>: always, never, often</li></ul><p class="tip">Many adverbs end in <b>-ly</b>, but not all! And some -ly words (friendly, lovely) are adjectives.</p>'),
  ], [
    { t: 'tap', q: 'Tap the adverb.', s: 'The baby slept peacefully.', a: ['peacefully'], e: 'Peacefully tells how the baby slept.' },
    { t: 'tap', q: 'Tap the two adverbs.', s: 'Yesterday we played outside.', a: ['Yesterday', 'outside'], e: 'Yesterday tells when; outside tells where.' },
    { t: 'mc', q: 'Which word is an adverb?', c: ['quickly', 'quick', 'quiz', 'queen'], a: 'quickly', e: 'Quickly tells how something is done.' },
    { t: 'mc', q: '"She sings beautifully." The adverb tells...', c: ['how', 'when', 'where', 'how often'], a: 'how', e: 'Beautifully tells how she sings.' },
    { t: 'mc', q: '"We will leave soon." The adverb tells...', c: ['how', 'when', 'where', 'what kind'], a: 'when', e: 'Soon tells when.' },
    { t: 'mc', q: 'Which adverb does NOT end in -ly?', c: ['often', 'lovely', 'friendly', 'ugly'], a: 'often', e: 'Often is an adverb. Lovely, friendly and ugly are adjectives!' },
    { t: 'mc', q: 'The turtle moved ___.', c: ['slow', 'slowly', 'slower', 'slowness'], a: 'slowly', e: 'Slowly describes how it moved.' },
    { t: 'tap', q: 'Tap the word that tells how often.', s: 'He always brushes his teeth.', a: ['always'], e: 'Always tells how often.' },
  ]),
  U('connectors', 'pos', 'Prepositions, Conjunctions & Interjections', '🔗', [
    L('Prepositions', '<p>A <b>preposition</b> shows where or when something is, compared to something else.</p><p><b>in, on, under, over, between, behind, beside, after, before, during, through</b></p><p><i>The cat hid <b>under</b> the bed.</i></p>'),
    L('Conjunctions', '<p>A <b>conjunction</b> joins words or sentences. Remember <b>FANBOYS</b>: <b>F</b>or, <b>A</b>nd, <b>N</b>or, <b>B</b>ut, <b>O</b>r, <b>Y</b>et, <b>S</b>o.</p><p>Others: <b>because, although, when, if, while</b>.</p><p><i>I was hungry, <b>so</b> I made a sandwich.</i></p>'),
    L('Interjections', '<p>An <b>interjection</b> shows strong feeling: <b>Wow! Oops! Hooray! Ouch! Yikes!</b></p><p>Use an exclamation point or a comma after it.</p>'),
  ], [
    { t: 'tap', q: 'Tap the preposition.', s: 'The cat hid under the bed.', a: ['under'], e: 'Under shows where the cat hid.' },
    { t: 'tap', q: 'Tap the conjunction.', s: 'I wanted to play, but it was raining.', a: ['but'], e: 'But joins two ideas that contrast.' },
    { t: 'mc', q: 'Which word is a preposition?', c: ['between', 'jump', 'green', 'happily'], a: 'between', e: 'Between shows position.' },
    { t: 'mc', q: 'I was hungry, ___ I made a sandwich.', c: ['so', 'but', 'or', 'nor'], a: 'so', e: 'So shows a result.' },
    { t: 'mc', q: 'Do you want juice ___ milk?', c: ['or', 'so', 'because', 'yet'], a: 'or', e: 'Or gives a choice.' },
    { t: 'mc', q: 'Which word is an interjection?', c: ['Hooray', 'table', 'under', 'slowly'], a: 'Hooray', e: 'Hooray shows excitement.' },
    { t: 'tap', q: 'Tap the interjection.', s: 'Oops, I spilled my water!', a: ['Oops'], e: 'Oops shows a feeling.' },
    { t: 'mc', q: 'What does FANBOYS help you remember?', c: ['conjunctions', 'prepositions', 'pronouns', 'adverbs'], a: 'conjunctions', e: 'For, And, Nor, But, Or, Yet, So.' },
  ]),

  // ---------------- Sentences ----------------
  U('subject-predicate', 'sent', 'Subjects & Predicates', '🧩', [
    L('Two parts of a sentence', '<p>Every complete sentence has:</p><ul><li>a <b>subject</b>: who or what the sentence is about</li><li>a <b>predicate</b>: what the subject does or is</li></ul><p><i>[<b>The noisy crows</b>] [<b>woke everyone up</b>].</i></p><p>The <b>simple subject</b> is the main noun (crows). The <b>simple predicate</b> is the main verb (woke).</p>'),
    L('Compound subjects and predicates', '<p><b>Compound subject</b>: two subjects share a verb: <i><b>Ben and Ava</b> played chess.</i></p><p><b>Compound predicate</b>: one subject does two things: <i>The dog <b>barked and wagged</b> its tail.</i></p>'),
  ], [
    { t: 'tap', q: 'Tap the simple subject.', s: 'The tall giraffe ate leaves.', a: ['giraffe'], e: 'The sentence is about the giraffe.' },
    { t: 'tap', q: 'Tap the simple predicate (main verb).', s: 'My little brother giggled loudly.', a: ['giggled'], e: 'Giggled is what the brother did.' },
    { t: 'mc', q: 'What is the complete subject? "The noisy crows woke everyone up."', c: ['The noisy crows', 'woke everyone up', 'crows woke', 'everyone'], a: 'The noisy crows', e: 'The complete subject is all the words about who.' },
    { t: 'mc', q: 'What is the complete predicate? "Our class planted a garden."', c: ['planted a garden', 'Our class', 'class planted', 'a garden'], a: 'planted a garden', e: 'The predicate tells what the class did.' },
    { t: 'mc', q: 'Which sentence has a compound subject?', c: ['Ben and Ava played chess.', 'Ben played and laughed.', 'Ben played chess.', 'Ben is happy.'], a: 'Ben and Ava played chess.', e: 'Two subjects: Ben and Ava.' },
    { t: 'mc', q: 'Which sentence has a compound predicate?', c: ['The dog barked and wagged its tail.', 'The dog and cat slept.', 'The dog barked.', 'Dogs are fun.'], a: 'The dog barked and wagged its tail.', e: 'One subject doing two actions.' },
    { t: 'tap', q: 'Tap the two verbs in the compound predicate.', s: 'Lena sang and danced on stage.', a: ['sang', 'danced'], e: 'Lena did two things.' },
    { t: 'mc', q: 'Every complete sentence needs...', c: ['a subject and a predicate', 'an adjective', 'a comma', 'two verbs'], a: 'a subject and a predicate', e: 'Who/what + what they do or are.' },
  ]),
  U('sentence-types', 'sent', 'Four Kinds of Sentences', '❗', [
    L('Sentence types', '<ul><li><b>Declarative</b> - tells something. Ends with <b>.</b> <i>The moon orbits Earth.</i></li><li><b>Interrogative</b> - asks something. Ends with <b>?</b> <i>Do you like pizza?</i></li><li><b>Imperative</b> - gives a command. Ends with <b>.</b> or <b>!</b> <i>Please close the door.</i></li><li><b>Exclamatory</b> - shows strong feeling. Ends with <b>!</b> <i>What an amazing goal!</i></li></ul>'),
  ], [
    { t: 'mc', q: 'What kind of sentence is "Please close the door."?', c: ['declarative', 'interrogative', 'imperative', 'exclamatory'], a: 'imperative', e: 'It gives a command.' },
    { t: 'mc', q: 'What kind of sentence is "Do you like pizza?"', c: ['declarative', 'interrogative', 'imperative', 'exclamatory'], a: 'interrogative', e: 'It asks a question.' },
    { t: 'mc', q: 'What kind of sentence is "The moon orbits Earth."?', c: ['declarative', 'interrogative', 'imperative', 'exclamatory'], a: 'declarative', e: 'It tells a fact.' },
    { t: 'mc', q: 'What kind of sentence is "What an amazing goal!"?', c: ['declarative', 'interrogative', 'imperative', 'exclamatory'], a: 'exclamatory', e: 'It shows strong feeling.' },
    { t: 'mc', q: 'Which end mark belongs? "Where is my backpack__"', c: ['.', '?', '!', ','], a: '?', e: 'It asks a question.' },
    { t: 'mc', q: 'Which sentence is a command?', c: ['Sit down, please.', 'I sat down.', 'Did you sit?', 'Wow, a seat!'], a: 'Sit down, please.', e: 'It tells someone to do something.' },
    { t: 'mc', q: 'Which sentence is exclamatory?', c: ["I can't believe we won!", 'We won the game.', 'Did we win?', 'Tell me who won.'], a: "I can't believe we won!", e: 'It shows excitement.' },
    { t: 'mc', q: 'A declarative sentence...', c: ['tells something', 'asks something', 'gives an order', 'shows surprise'], a: 'tells something', e: 'Declare = tell.' },
  ]),
  U('fragments', 'sent', 'Fragments & Run-ons', '🧱', [
    L('Fragments', '<p>A <b>fragment</b> is only part of a sentence. It is missing a subject or a predicate, or it is not a complete thought.</p><ul><li><i>Ran to the store.</i> (Who ran?)</li><li><i>The puppy in the basket.</i> (What did it do?)</li><li><i>Because it rained.</i> (Then what?)</li></ul>'),
    L('Run-ons', '<p>A <b>run-on</b> jams two sentences together with no break.</p><p>✗ <i>I like cats they are soft.</i></p><p>Fix it with a period, or a comma + conjunction:</p><p>✓ <i>I like cats. They are soft.</i><br>✓ <i>I like cats, because they are soft.</i></p>'),
  ], [
    { t: 'mc', q: 'Which is a complete sentence?', c: ['The bird sang a song.', 'Under the big tree.', 'Running very fast.', 'Because it rained.'], a: 'The bird sang a song.', e: 'It has a subject (bird) and predicate (sang a song).' },
    { t: 'mc', q: 'Which is a fragment?', c: ['After the party.', 'We danced all night.', 'She smiled.', 'It is late.'], a: 'After the party.', e: 'It has no subject or verb.' },
    { t: 'mc', q: 'Which is a run-on sentence?', c: ['I love soccer I play every day.', 'I love soccer.', 'I love soccer, so I play every day.', 'I play every day.'], a: 'I love soccer I play every day.', e: 'Two sentences are jammed together.' },
    { t: 'mc', q: 'Best fix for "It was cold we wore coats."', c: ['It was cold, so we wore coats.', 'It was cold we, wore coats.', 'It was cold so, we wore coats', 'It was. Cold we wore coats.'], a: 'It was cold, so we wore coats.', e: 'Comma + conjunction joins the two sentences.' },
    { t: 'mc', q: '"Jumped over the fence." What is missing?', c: ['a subject', 'a predicate', 'an end mark', 'nothing'], a: 'a subject', e: 'Who jumped?' },
    { t: 'mc', q: '"The little puppy in the basket." What is missing?', c: ['a predicate (verb)', 'a subject', 'a capital letter', 'nothing'], a: 'a predicate (verb)', e: 'What did the puppy do?' },
    { t: 'mc', q: 'Which fixes the fragment "Because I was tired."?', c: ['I went to bed early because I was tired.', 'Because I was tired and.', 'Because tired.', 'I because was tired.'], a: 'I went to bed early because I was tired.', e: 'Now it is a complete thought.' },
    { t: 'mc', q: 'Is "Stop!" a complete sentence?', c: ['Yes - the subject "you" is understood', 'No - it has no verb', 'No - it is too short', 'No - it needs a comma'], a: 'Yes - the subject "you" is understood', e: 'Commands have a hidden subject: (You) stop!' },
  ]),
  U('agreement', 'sent', 'Subject-Verb Agreement', '🤝', [
    L('Make them match', '<p>The subject and verb must <b>agree</b>.</p><ul><li>One (singular) subject → verb usually ends in <b>-s</b>: <i>The dog <b>barks</b>.</i></li><li>More than one (plural) → no -s: <i>The dogs <b>bark</b>.</i></li><li><b>I</b> and <b>you</b> use the plain form: <i>I <b>run</b>. You <b>run</b>.</i></li><li>Two subjects joined by <b>and</b> are plural: <i>Tom and Jerry <b>are</b> friends.</i></li><li><b>Everyone, each, nobody</b> are singular: <i>Everyone <b>gets</b> a snack.</i></li></ul>'),
    L('Tricky ones', '<p>Ignore the words in between! <i>The box <s>of crayons</s> <b>is</b> on the desk.</i> The subject is <b>box</b>.</p><p>With <b>or / nor</b>, match the closer subject: <i>Neither the cat nor the dog <b>is</b> hungry.</i></p>'),
  ], [
    { t: 'mc', q: 'The birds ___ every morning.', c: ['sing', 'sings'], a: 'sing', e: 'Birds is plural: no -s.' },
    { t: 'mc', q: 'My sister ___ the piano.', c: ['play', 'plays'], a: 'plays', e: 'Sister is singular: add -s.' },
    { t: 'mc', q: 'Tom and Jerry ___ friends.', c: ['is', 'are'], a: 'are', e: 'Two subjects joined by and = plural.' },
    { t: 'mc', q: 'Everyone ___ a snack.', c: ['gets', 'get'], a: 'gets', e: 'Everyone is singular.' },
    { t: 'mc', q: 'The box of crayons ___ on the desk.', c: ['is', 'are'], a: 'is', e: 'The subject is box (singular).' },
    { t: 'mc', q: 'I ___ my homework after school.', c: ['do', 'does'], a: 'do', e: 'I uses the plain form.' },
    { t: 'mc', q: 'Which sentence is correct?', c: ['The kids runs fast.', 'The kids run fast.'], a: 'The kids run fast.', e: 'Kids is plural.' },
    { t: 'mc', q: 'Neither the cat nor the dog ___ hungry.', c: ['is', 'are'], a: 'is', e: 'Match the closer subject, dog (singular).' },
  ]),
  U('tenses', 'sent', 'Verb Tenses', '⏰', [
    L('Past, present, future', '<ul><li><b>Past</b> - already happened: <i>I <b>walked</b>.</i></li><li><b>Present</b> - happening now or regularly: <i>I <b>walk</b>.</i></li><li><b>Future</b> - will happen: <i>I <b>will walk</b>.</i></li></ul><p>Regular verbs add <b>-ed</b> for the past. Consonant + y → <b>-ied</b>: carry → carried.</p>'),
    L('Irregular verbs', '<p>Some verbs change completely in the past:</p><p>go → <b>went</b>, see → <b>saw</b>, eat → <b>ate</b>, run → <b>ran</b>, buy → <b>bought</b>, think → <b>thought</b>, take → <b>took</b>, write → <b>wrote</b>, bring → <b>brought</b>, swim → <b>swam</b></p><p class="tip">Keep the tense the same through a sentence: <i>Yesterday I <b>walked</b> home and <b>ate</b> dinner.</i></p>'),
  ], [
    { t: 'fill', q: 'Write the past tense of "go".', s: 'Yesterday we ___ to the museum.', a: ['went'], e: 'Go is irregular: went.' },
    { t: 'fill', q: 'Write the past tense of "see".', s: 'Last night I ___ a shooting star.', a: ['saw'], e: 'See is irregular: saw.' },
    { t: 'fill', q: 'Write the past tense of "eat".', s: 'She ___ her lunch quickly.', a: ['ate'], e: 'Eat is irregular: ate.' },
    { t: 'mc', q: 'Which sentence is in the future tense?', c: ['We will visit Grandma.', 'We visited Grandma.', 'We visit Grandma.', "We were at Grandma's."], a: 'We will visit Grandma.', e: 'Will + verb = future.' },
    { t: 'mc', q: 'Past tense of "think"?', c: ['thinked', 'thought', 'thunk', 'thinks'], a: 'thought', e: 'Think is irregular: thought.' },
    { t: 'mc', q: 'Past tense of "carry"?', c: ['carryed', 'carried', 'carrid', 'carries'], a: 'carried', e: 'Consonant + y → ied.' },
    { t: 'mc', q: 'Yesterday I ___ home and ate dinner.', c: ['walked', 'walk', 'will walk', 'walks'], a: 'walked', e: 'Keep the tense the same: past.' },
    { t: 'fill', q: 'Write "watch" in the future tense.', s: 'Tomorrow they ___ the game.', a: ['will watch'], e: 'Future = will + verb.' },
  ]),

  // ---------------- Punctuation & Capitals ----------------
  U('capitals', 'punct', 'Capital Letters', '🔠', [
    L('When to capitalize', '<ul><li>The <b>first word</b> of a sentence</li><li>The word <b>I</b></li><li><b>Names</b> of people and pets: <i>Max, Aunt Rosa</i></li><li><b>Places</b>: <i>Paris, Lake Erie, Texas</i></li><li><b>Days, months, holidays</b>: <i>Tuesday, June, Thanksgiving</i></li><li>Important words in <b>titles</b>: <i>The Cat in the Hat</i></li></ul><p class="tip">Seasons are NOT capitalized: spring, summer, fall, winter.</p>'),
  ], [
    { t: 'mc', q: 'Which sentence is capitalized correctly?', c: ['On Friday, Sam and I went to Lake Erie.', 'on friday, Sam and i went to lake Erie.', 'On friday, sam and I went to Lake erie.', 'On Friday, Sam and I went to lake erie.'], a: 'On Friday, Sam and I went to Lake Erie.', e: 'Days, names, I, and place names get capitals.' },
    { t: 'mc', q: 'Which word should be capitalized?', c: ['thanksgiving', 'winter', 'teacher', 'river'], a: 'thanksgiving', e: 'Holidays are capitalized. Seasons are not.' },
    { t: 'mc', q: 'Which is correct?', c: ['My favorite season is summer.', 'My favorite season is Summer.'], a: 'My favorite season is summer.', e: 'Seasons are lowercase.' },
    { t: 'tap', q: 'Tap the words that need a capital letter.', s: 'last june my aunt flew to paris.', a: ['last', 'june', 'paris'], e: 'First word, a month, and a city.' },
    { t: 'mc', q: 'Which book title is capitalized correctly?', c: ['The Cat in the Hat', 'The cat in the hat', 'the Cat In The Hat', 'The Cat In the hat'], a: 'The Cat in the Hat', e: 'Capitalize the first word and important words. Small words like in and the stay lowercase.' },
    { t: 'mc', q: 'Which word is always capitalized?', c: ['I', 'me', 'my', 'mine'], a: 'I', e: 'The pronoun I is always a capital.' },
    { t: 'tap', q: 'Tap the words that need capitals.', s: 'my dog max loves tuesday walks.', a: ['my', 'max', 'tuesday'], e: 'First word, a pet name, and a day.' },
    { t: 'mc', q: 'Which needs capitals?', c: ['the amazon river', 'a long river', 'the river bank', 'river water'], a: 'the amazon river', e: 'The Amazon River is a specific place.' },
  ]),
  U('commas', 'punct', 'End Marks & Commas', '✏️', [
    L('Commas: where they go', '<ul><li><b>Lists</b>: <i>eggs, milk, and bread</i></li><li><b>Dates</b>: <i>July 4, 2026</i></li><li><b>City and state</b>: <i>Austin, Texas</i></li><li>After <b>intro words</b>: <i>Yes, I can come. After lunch, we played.</i></li><li>Before a <b>conjunction joining two sentences</b>: <i>I studied, and I passed.</i></li><li><b>Talking to someone</b>: <i>Mom, can I go?</i></li></ul>'),
  ], [
    { t: 'mc', q: 'Which uses commas correctly in a list?', c: ['I packed socks, shirts, and shoes.', 'I packed, socks shirts and shoes.', 'I packed socks shirts, and, shoes.', 'I, packed socks, shirts and shoes.'], a: 'I packed socks, shirts, and shoes.', e: 'Commas separate the list items.' },
    { t: 'mc', q: 'Which date is written correctly?', c: ['May 5, 2025', 'May, 5 2025', 'May 5 2025,', 'May, 5, 2025'], a: 'May 5, 2025', e: 'The comma goes between the day and the year.' },
    { t: 'mc', q: 'Where does the comma go? "We live in Denver Colorado."', c: ['after Denver', 'after live', 'after We', 'no comma needed'], a: 'after Denver', e: 'Put a comma between a city and state.' },
    { t: 'mc', q: 'Which uses a comma correctly after an intro word?', c: ['Yes, I can come.', 'Yes I, can come.', 'Yes I can, come.', 'Yes I can come,'], a: 'Yes, I can come.', e: 'A comma goes right after the intro word.' },
    { t: 'mc', q: 'Which uses a comma for talking to someone?', c: ['Dad, can you help me?', 'Dad can, you help me?', 'Dad can you, help me?', 'Dad can you help, me?'], a: 'Dad, can you help me?', e: 'Put a comma after the name of the person you are talking to.' },
    { t: 'mc', q: 'Which joins two sentences correctly?', c: ['I studied hard, and I passed the test.', 'I studied hard and, I passed the test.', 'I studied, hard and I passed the test.', 'I studied hard and I, passed the test.'], a: 'I studied hard, and I passed the test.', e: 'Comma goes before the conjunction.' },
    { t: 'mc', q: 'Why is there a comma in "Mia, please sit down."?', c: ['We are talking to Mia', 'Mia is in a list', 'It is a date', 'It ends the sentence'], a: 'We are talking to Mia', e: 'This is called direct address.' },
    { t: 'mc', q: 'Which end mark fits? "Watch out for that bee__"', c: ['!', '?', ',', ';'], a: '!', e: 'A strong warning gets an exclamation point.' },
  ]),
  U('apostrophes', 'punct', 'Apostrophes', '👆', [
    L('Contractions', '<p>A <b>contraction</b> squeezes two words together. The apostrophe replaces the missing letters.</p><p>do not → <b>don\'t</b>, I am → <b>I\'m</b>, it is → <b>it\'s</b>, they are → <b>they\'re</b>, will not → <b>won\'t</b>, can not → <b>can\'t</b></p>'),
    L('Possessives', '<ul><li>One owner: add <b>\'s</b>: <i>the dog\'s bone</i></li><li>Plural owners ending in s: add <b>\'</b>: <i>the dogs\' bowls</i></li><li>Plural not ending in s: add <b>\'s</b>: <i>the children\'s toys</i></li></ul><p class="tip"><b>its</b> = belongs to it. <b>it\'s</b> = it is. Try saying "it is" - if it works, use it\'s.</p>'),
  ], [
    { t: 'mc', q: 'Contraction for "do not"', c: ["don't", "dont'", "do'nt", 'dont'], a: "don't", e: 'The apostrophe replaces the o in not.' },
    { t: 'mc', q: 'Contraction for "will not"', c: ["won't", "willn't", "wo'nt", "will'nt"], a: "won't", e: 'Will not is a special one: won\'t.' },
    { t: 'mc', q: 'The ___ tail is fluffy. (one cat)', c: ["cat's", "cats'", 'cats', 'cat'], a: "cat's", e: "One owner: add 's." },
    { t: 'mc', q: 'Both ___ bikes were red. (two boys)', c: ["boys'", "boy's", 'boys', "boys's"], a: "boys'", e: "Plural ending in s: add just '." },
    { t: 'mc', q: 'The ___ toys were everywhere.', c: ["children's", "childrens'", 'childrens', 'children'], a: "children's", e: "Children doesn't end in s, so add 's." },
    { t: 'mc', q: '___ going to rain today.', c: ["It's", 'Its'], a: "It's", e: 'It is going to rain → It\'s.' },
    { t: 'mc', q: 'The bird flapped ___ wings.', c: ['its', "it's"], a: 'its', e: 'The wings belong to it: its.' },
    { t: 'fill', q: 'Write the contraction for "they are".', s: '___ coming to the party.', a: ["they're"], e: "They are → they're." },
  ]),
  U('quotes', 'punct', 'Quotation Marks', '💬', [
    L('Showing what people say', '<p>Put <b>quotation marks</b> around the exact words someone says.</p><ul><li><i>"I love pizza," said Ella.</i></li><li><i>Leo asked, "Where are my shoes?"</i></li></ul><p>Rules: capitalize the first word of the quote, and put the comma, period, ? or ! <b>inside</b> the closing marks.</p><p>Also use quotation marks for titles of short works like songs, poems and stories: <i>"Happy Birthday"</i>.</p>'),
  ], [
    { t: 'mc', q: 'Which is punctuated correctly?', c: ['"I love pizza," said Ella.', '"I love pizza" said Ella.', '"I love pizza", said Ella.', 'I love pizza," said Ella.'], a: '"I love pizza," said Ella.', e: 'The comma goes inside the quotation marks.' },
    { t: 'mc', q: 'Which is punctuated correctly?', c: ['Leo asked, "Where are my shoes?"', 'Leo asked "Where are my shoes?"', 'Leo asked, "Where are my shoes"?', 'Leo asked, where are my shoes?'], a: 'Leo asked, "Where are my shoes?"', e: 'Comma before the quote, question mark inside.' },
    { t: 'mc', q: 'Which sentence needs quotation marks?', c: ['Run! shouted the coach.', 'The coach told us to run.', 'We ran fast.', 'The coach was proud.'], a: 'Run! shouted the coach.', e: 'It has the exact words the coach said.' },
    { t: 'mc', q: 'In "Can we go now?" asked Sam, where does the question mark go?', c: ['Inside the quotation marks', 'Outside the quotation marks', 'After Sam', 'There is none'], a: 'Inside the quotation marks', e: 'End marks of the quote go inside.' },
    { t: 'mc', q: 'Which uses quotation marks for a song title?', c: ['We sang "Happy Birthday" to Mom.', 'We sang Happy "Birthday" to Mom.', '"We sang Happy Birthday to Mom."'], a: 'We sang "Happy Birthday" to Mom.', e: 'Only the song title is in quotes.' },
    { t: 'mc', q: 'The first word inside a quote is...', c: ['capitalized', 'lowercase', 'in bold', 'skipped'], a: 'capitalized', e: 'A quote starts like a new sentence.' },
    { t: 'mc', q: 'Which shows the exact words someone said?', c: ['Mom said, "Bring an umbrella."', 'Mom said to bring an umbrella.'], a: 'Mom said, "Bring an umbrella."', e: 'Quotation marks show exact words.' },
    { t: 'mc', q: 'Which is correct?', c: ['"Let\'s go," Dad said, "before it gets dark."', '"Let\'s go, Dad said, before it gets dark."', '"Let\'s go" Dad said "before it gets dark."'], a: '"Let\'s go," Dad said, "before it gets dark."', e: 'Each part of the quote gets its own marks and commas.' },
  ]),

  // ---------------- Word Power ----------------
  U('homophones', 'words', 'Homophones', '👂', [
    L('Sound the same, mean different', '<p><b>Homophones</b> sound alike but have different spellings and meanings.</p><ul><li><b>their</b> (belongs to them) / <b>there</b> (a place) / <b>they\'re</b> (they are)</li><li><b>your</b> (belongs to you) / <b>you\'re</b> (you are)</li><li><b>to</b> (toward) / <b>too</b> (also, or very) / <b>two</b> (2)</li><li><b>hear</b> (with ears) / <b>here</b> (this place)</li><li><b>know</b> / <b>no</b>, <b>write</b> / <b>right</b></li></ul>'),
  ], [
    { t: 'mc', q: '___ backpacks are in the hall.', c: ['Their', 'There', "They're"], a: 'Their', e: 'The backpacks belong to them.' },
    { t: 'mc', q: "___ going to love this!", c: ["You're", 'Your'], a: "You're", e: 'You are going to love this.' },
    { t: 'mc', q: 'I have ___ sisters.', c: ['two', 'to', 'too'], a: 'two', e: 'Two is the number 2.' },
    { t: 'mc', q: 'Put the box over ___.', c: ['there', 'their', "they're"], a: 'there', e: 'There is a place.' },
    { t: 'mc', q: 'Can you ___ the music?', c: ['hear', 'here'], a: 'hear', e: 'You hear with your ear!' },
    { t: 'mc', q: 'I ___ the answer!', c: ['know', 'no'], a: 'know', e: 'Know means to understand.' },
    { t: 'mc', q: 'Please ___ your name at the top.', c: ['write', 'right', 'rite'], a: 'write', e: 'Write means to put words on paper.' },
    { t: 'mc', q: 'This soup is ___ hot to eat.', c: ['too', 'to', 'two'], a: 'too', e: 'Too means very or more than enough.' },
  ]),
  U('affixes', 'words', 'Prefixes & Suffixes', '🧬', [
    L('Prefixes', '<p>A <b>prefix</b> goes at the start of a word and changes its meaning.</p><ul><li><b>un-</b> = not (unhappy)</li><li><b>re-</b> = again (reread)</li><li><b>pre-</b> = before (preview)</li><li><b>dis-</b> = opposite (disagree)</li><li><b>mis-</b> = wrongly (misspell)</li></ul>'),
    L('Suffixes', '<p>A <b>suffix</b> goes at the end of a word.</p><ul><li><b>-ful</b> = full of (joyful)</li><li><b>-less</b> = without (fearless)</li><li><b>-er</b> = one who (teacher)</li><li><b>-able</b> = can be (breakable)</li><li><b>-ly</b> = in a way (softly)</li><li><b>-ness</b> = state of being (kindness)</li></ul>'),
  ], [
    { t: 'mc', q: 'What does "reread" mean?', c: ['read again', 'not read', 'read before', 'read wrongly'], a: 'read again', e: 're- = again.' },
    { t: 'mc', q: '"Unhappy" means...', c: ['not happy', 'happy again', 'very happy', 'happy before'], a: 'not happy', e: 'un- = not.' },
    { t: 'mc', q: '"Fearless" means...', c: ['without fear', 'full of fear', 'fear again', 'afraid before'], a: 'without fear', e: '-less = without.' },
    { t: 'mc', q: 'Which suffix means "full of"?', c: ['-ful', '-less', '-er', '-ly'], a: '-ful', e: 'Joyful = full of joy.' },
    { t: 'fill', q: 'Add a suffix to "teach".', s: 'A person who teaches is a ___.', a: ['teacher'], e: '-er = one who.' },
    { t: 'mc', q: '"Preview" means...', c: ['see before', 'see again', 'not see', 'see wrongly'], a: 'see before', e: 'pre- = before.' },
    { t: 'mc', q: 'Which word means "spell wrongly"?', c: ['misspell', 'unspell', 'respell', 'prespell'], a: 'misspell', e: 'mis- = wrongly.' },
    { t: 'mc', q: '"Breakable" means...', c: ['can be broken', 'without breaking', 'broke again', 'one who breaks'], a: 'can be broken', e: '-able = can be.' },
  ]),
  U('synonyms', 'words', 'Synonyms & Antonyms', '↔️', [
    L('Same and opposite', '<p><b>Synonyms</b> have the same or nearly the same meaning: <i>big / large, happy / glad</i>.</p><p><b>Antonyms</b> have opposite meanings: <i>hot / cold, ancient / modern</i>.</p><p class="tip">Use a thesaurus to find synonyms that make your writing more interesting!</p>'),
  ], [
    { t: 'mc', q: 'Synonym for "huge"', c: ['enormous', 'tiny', 'quiet', 'quick'], a: 'enormous', e: 'Both mean very big.' },
    { t: 'mc', q: 'Antonym for "ancient"', c: ['modern', 'old', 'broken', 'famous'], a: 'modern', e: 'Ancient = very old; modern = new.' },
    { t: 'mc', q: 'Synonym for "glad"', c: ['happy', 'sad', 'angry', 'tired'], a: 'happy', e: 'Glad and happy mean the same.' },
    { t: 'mc', q: 'Antonym for "brave"', c: ['cowardly', 'bold', 'strong', 'kind'], a: 'cowardly', e: 'Cowardly is the opposite of brave.' },
    { t: 'mc', q: 'Which pair are synonyms?', c: ['begin / start', 'hot / cold', 'up / down', 'win / lose'], a: 'begin / start', e: 'They mean the same thing.' },
    { t: 'mc', q: 'Which pair are antonyms?', c: ['shallow / deep', 'little / small', 'fast / quick', 'shout / yell'], a: 'shallow / deep', e: 'They are opposites.' },
    { t: 'mc', q: 'Synonym for "exhausted"', c: ['very tired', 'very hungry', 'excited', 'lost'], a: 'very tired', e: 'Exhausted means worn out.' },
    { t: 'mc', q: 'Antonym for "generous"', c: ['selfish', 'kind', 'giving', 'rich'], a: 'selfish', e: 'Generous people share; selfish people do not.' },
  ]),
  U('context', 'words', 'Context Clues', '🔍', [
    L('Be a word detective', '<p>When you meet a new word, look at the words around it for <b>clues</b>.</p><ul><li><b>Definition clue</b>: <i>The desert was <b>arid</b>, which means very dry.</i></li><li><b>Example clue</b>: <i>Fruits such as mangoes and papayas grow in <b>tropical</b> places.</i></li><li><b>Opposite clue</b>: <i>Unlike his <b>timid</b> brother, Jay loved crowds.</i></li><li><b>Synonym clue</b>: <i>She was <b>famished</b> - really hungry!</i></li></ul>'),
  ], [
    { t: 'mc', q: '"The desert was so arid that no plants could grow." Arid means...', c: ['very dry', 'very wet', 'very cold', 'very loud'], a: 'very dry', e: 'Plants cannot grow without water.' },
    { t: 'mc', q: '"Maria was famished; she hadn\'t eaten all day." Famished means...', c: ['very hungry', 'very sleepy', 'very happy', 'very late'], a: 'very hungry', e: "She hadn't eaten all day." },
    { t: 'mc', q: '"Unlike his timid brother, Jay loved to speak in front of crowds." Timid means...', c: ['shy', 'loud', 'funny', 'tall'], a: 'shy', e: '"Unlike" tells you timid is the opposite of loving crowds.' },
    { t: 'mc', q: '"The kitten was minuscule, small enough to fit in a teacup." Minuscule means...', c: ['tiny', 'fluffy', 'scared', 'orange'], a: 'tiny', e: 'It fits in a teacup!' },
    { t: 'mc', q: '"After the long hike, the weary campers fell asleep right away." Weary means...', c: ['tired', 'excited', 'hungry', 'lost'], a: 'tired', e: 'They fell asleep after a long hike.' },
    { t: 'mc', q: '"The rules are mandatory, so everyone must follow them." Mandatory means...', c: ['required', 'optional', 'silly', 'new'], a: 'required', e: '"Everyone must" is the clue.' },
    { t: 'mc', q: '"The room was in disarray: clothes, books, and toys were everywhere." Disarray means...', c: ['a mess', 'very clean', 'dark', 'empty'], a: 'a mess', e: 'Things everywhere = messy.' },
    { t: 'mc', q: '"The ancient castle, built over 900 years ago, still stands." Ancient means...', c: ['very old', 'very big', 'broken', 'new'], a: 'very old', e: '900 years ago is the clue.' },
  ]),

  // ---------------- Figurative Language ----------------
  U('similes', 'fig', 'Similes & Metaphors', '🌟', [
    L('Comparing in a creative way', '<p>A <b>simile</b> compares two things using <b>like</b> or <b>as</b>: <i>Her smile was <b>as bright as</b> the sun. He ran <b>like</b> the wind.</i></p><p>A <b>metaphor</b> says one thing <b>is</b> another: <i>The classroom <b>was</b> a zoo.</i> (It was noisy and wild - not full of animals!)</p>'),
  ], [
    { t: 'mc', q: '"Her smile was as bright as the sun." This is a...', c: ['simile', 'metaphor', 'idiom', 'hyperbole'], a: 'simile', e: 'It uses "as".' },
    { t: 'mc', q: '"My brother is a couch potato." This is a...', c: ['simile', 'metaphor'], a: 'metaphor', e: 'It says he IS something, no like or as.' },
    { t: 'mc', q: '"He ran like the wind." This is a...', c: ['simile', 'metaphor'], a: 'simile', e: 'It uses "like".' },
    { t: 'mc', q: '"The snow was a white blanket." This is a...', c: ['simile', 'metaphor'], a: 'metaphor', e: 'The snow IS a blanket.' },
    { t: 'mc', q: 'What does "The classroom was a zoo" mean?', c: ['It was noisy and wild', 'It had animals', 'It was empty', 'It was outside'], a: 'It was noisy and wild', e: 'A metaphor compares the class to a wild zoo.' },
    { t: 'mc', q: 'Which is a simile?', c: ['as busy as a bee', 'busy bees buzz', 'the bee is busy', 'a bee is an insect'], a: 'as busy as a bee', e: 'Uses "as ... as".' },
    { t: 'mc', q: 'Which is a metaphor?', c: ['Time is a thief.', 'Time flies like an arrow.', "It is 3 o'clock.", 'I have time.'], a: 'Time is a thief.', e: 'It says time IS a thief.' },
    { t: 'mc', q: 'Similes use the words...', c: ['like or as', 'and or but', 'is or are', 'very or so'], a: 'like or as', e: 'Like or as.' },
  ]),
  U('personification', 'fig', 'Personification & Hyperbole', '🎭', [
    L('Personification', '<p><b>Personification</b> gives human actions or feelings to things that are not human.</p><p><i>The wind <b>whispered</b>. The leaves <b>danced</b>. The old car <b>groaned</b> up the hill.</i></p>'),
    L('Hyperbole', '<p><b>Hyperbole</b> (say: hy-PER-bo-lee) is a huge exaggeration for effect. It isn\'t meant to be true!</p><p><i>I\'m so hungry I could eat a horse. My backpack weighs a ton. I\'ve told you a million times!</i></p>'),
  ], [
    { t: 'mc', q: '"The leaves danced in the wind." This is...', c: ['personification', 'hyperbole', 'simile', 'fact'], a: 'personification', e: 'Leaves can\'t really dance.' },
    { t: 'mc', q: '"I\'m so hungry I could eat a horse." This is...', c: ['hyperbole', 'personification', 'metaphor', 'fact'], a: 'hyperbole', e: "It's a big exaggeration." },
    { t: 'mc', q: '"My backpack weighs a ton!" This is...', c: ['hyperbole', 'personification'], a: 'hyperbole', e: "A backpack can't weigh a ton." },
    { t: 'mc', q: '"The old car coughed and groaned up the hill." This is...', c: ['personification', 'hyperbole'], a: 'personification', e: 'Cars don\'t cough - people do.' },
    { t: 'mc', q: 'Which is personification?', c: ['The sun smiled down on us.', 'The sun is a star.', 'The sun is very hot.', 'The sun rises in the east.'], a: 'The sun smiled down on us.', e: 'The sun is given a human action, smiling.' },
    { t: 'mc', q: 'Which is hyperbole?', c: ['This line is a mile long!', 'The line is long.', 'There are ten people in line.', 'I am in line.'], a: 'This line is a mile long!', e: 'A huge exaggeration.' },
    { t: 'mc', q: '"The stars winked at me." What is given human traits?', c: ['the stars', 'me', 'the night', 'nothing'], a: 'the stars', e: 'Stars can\'t really wink.' },
    { t: 'mc', q: 'Why do writers use hyperbole?', c: ['to exaggerate for effect', 'to give facts', 'to ask questions', 'to list items'], a: 'to exaggerate for effect', e: 'It makes writing funny or dramatic.' },
  ]),
  U('idioms', 'fig', 'Idioms', '🤔', [
    L('Sayings that mean something else', '<p>An <b>idiom</b> is a saying whose meaning is different from its actual words.</p><ul><li><b>raining cats and dogs</b> = raining very hard</li><li><b>a piece of cake</b> = very easy</li><li><b>break a leg</b> = good luck</li><li><b>spill the beans</b> = tell a secret</li><li><b>under the weather</b> = feeling sick</li><li><b>hit the books</b> = study</li><li><b>cost an arm and a leg</b> = very expensive</li><li><b>hold your horses</b> = wait, be patient</li></ul>'),
  ], [
    { t: 'mc', q: '"That test was a piece of cake." It was...', c: ['very easy', 'delicious', 'very hard', 'about baking'], a: 'very easy', e: 'A piece of cake = easy.' },
    { t: 'mc', q: '"I\'m feeling under the weather." I feel...', c: ['sick', 'wet', 'cold', 'happy'], a: 'sick', e: 'Under the weather = not well.' },
    { t: 'mc', q: '"Break a leg in your play!" means...', c: ['Good luck!', 'Be careful!', 'Run fast!', 'Get hurt!'], a: 'Good luck!', e: 'Actors say it for good luck.' },
    { t: 'mc', q: '"Don\'t spill the beans about the party." means...', c: ["Don't tell the secret", "Don't drop food", "Don't cook", "Don't be late"], a: "Don't tell the secret", e: 'Spill the beans = tell a secret.' },
    { t: 'mc', q: '"It\'s raining cats and dogs." means...', c: ["It's raining very hard", 'Animals are falling', "It's sunny", "It's snowing"], a: "It's raining very hard", e: 'A fun way to say heavy rain.' },
    { t: 'mc', q: '"Time to hit the books." means...', c: ['Time to study', 'Time to throw books', 'Time to read comics', 'Time to clean'], a: 'Time to study', e: 'Hit the books = study hard.' },
    { t: 'mc', q: '"That bike cost an arm and a leg." It was...', c: ['very expensive', 'free', 'broken', 'heavy'], a: 'very expensive', e: 'It cost a lot!' },
    { t: 'mc', q: '"Hold your horses!" means...', c: ['Wait / be patient', 'Ride a horse', 'Hurry up', 'Feed the horses'], a: 'Wait / be patient', e: 'Slow down and wait.' },
  ]),
  U('sounds', 'fig', 'Sound Words', '🔊', [
    L('Alliteration, onomatopoeia, rhyme', '<p><b>Alliteration</b> repeats the beginning sound of nearby words: <i><b>S</b>ally <b>s</b>ells <b>s</b>ea<b>s</b>hells.</i></p><p><b>Onomatopoeia</b> (on-oh-mat-oh-PEE-uh) is a word that sounds like the noise it names: <i>buzz, boom, sizzle, woof, tick</i>.</p><p><b>Rhyme</b> is when words end with the same sound: <i>cat / hat, light / night</i>.</p>'),
  ], [
    { t: 'mc', q: '"Sally sells seashells by the seashore." uses...', c: ['alliteration', 'onomatopoeia', 'rhyme', 'hyperbole'], a: 'alliteration', e: 'Lots of words start with s.' },
    { t: 'tap', q: 'Tap the onomatopoeia (sound words).', s: 'Buzz went the bee as the door creaked open.', a: ['Buzz', 'creaked'], e: 'Buzz and creaked sound like the noises they name.' },
    { t: 'mc', q: 'Which is onomatopoeia?', c: ['boom', 'loud', 'sound', 'ears'], a: 'boom', e: 'Boom sounds like an explosion.' },
    { t: 'mc', q: 'Which is alliteration?', c: ['Big brown bears bounce', 'The bear is big', 'A bear and a fox', 'Bears like honey'], a: 'Big brown bears bounce', e: 'Repeats the b sound.' },
    { t: 'mc', q: 'Which pair rhymes?', c: ['cat / hat', 'cat / cot', 'cat / dog', 'cat / cab'], a: 'cat / hat', e: 'Both end in -at.' },
    { t: 'mc', q: 'Onomatopoeia is a word that...', c: ['sounds like what it means', 'repeats a first sound', 'compares two things', 'exaggerates'], a: 'sounds like what it means', e: 'Like sizzle or splash.' },
    { t: 'mc', q: 'Alliteration repeats...', c: ['the beginning sound of words', 'the last word', 'a whole sentence', 'a question'], a: 'the beginning sound of words', e: 'Peter Piper picked peppers...' },
    { t: 'tap', q: 'Tap the sound words.', s: 'The dog said woof and the clock went tick.', a: ['woof', 'tick'], e: 'Woof and tick are sounds.' },
  ]),

  // ---------------- Reading & Writing ----------------
  U('main-idea', 'read', 'Main Idea & Details', '🎯', [
    L('What is it mostly about?', '<p>The <b>main idea</b> is what a passage is mostly about. <b>Supporting details</b> are facts or examples that explain it.</p><p class="tip">Look at the title and the first and last sentences - the main idea often hides there.</p><p>Ask: "Which sentence would make a good title?"</p>'),
  ], [
    { t: 'mc', p: 'Bees are very important. They carry pollen from flower to flower, which helps plants make fruit and seeds. Without bees, we would have fewer apples, berries, and nuts.', q: 'What is the main idea?', c: ['Bees are important to plants and food.', 'Bees can sting.', 'Apples are red.', 'Flowers smell nice.'], a: 'Bees are important to plants and food.', e: 'The whole passage explains why bees matter.' },
    { t: 'mc', p: 'Bees are very important. They carry pollen from flower to flower, which helps plants make fruit and seeds. Without bees, we would have fewer apples, berries, and nuts.', q: 'Which detail supports the main idea?', c: ['Bees carry pollen from flower to flower.', 'Bees are yellow and black.', 'Some people fear bees.', 'Honey is sticky.'], a: 'Bees carry pollen from flower to flower.', e: 'This shows how bees help plants.' },
    { t: 'mc', p: 'Penguins are birds, but they cannot fly. Instead, they are amazing swimmers. Their wings work like flippers, and their smooth bodies glide through icy water.', q: 'What is the main idea?', c: ['Penguins are birds that swim instead of fly.', 'Penguins live in zoos.', 'Water is icy.', 'All birds can fly.'], a: 'Penguins are birds that swim instead of fly.', e: 'Every sentence is about penguins swimming.' },
    { t: 'mc', p: 'Penguins are birds, but they cannot fly. Instead, they are amazing swimmers. Their wings work like flippers, and their smooth bodies glide through icy water.', q: 'Which detail supports the main idea?', c: ['Their wings work like flippers.', 'Penguins are black and white.', 'Penguins eat fish.', 'Penguins lay eggs.'], a: 'Their wings work like flippers.', e: 'It explains how they swim.' },
    { t: 'mc', p: 'Recess is good for students. Playing outside gives kids exercise. It also helps them make friends. After recess, many students focus better in class.', q: 'Which detail does NOT support the main idea?', c: ['Some schools have big cafeterias.', 'Playing outside gives exercise.', 'Recess helps kids make friends.', 'Students focus better after recess.'], a: 'Some schools have big cafeterias.', e: 'Cafeterias have nothing to do with why recess is good.' },
    { t: 'mc', q: 'The main idea is...', c: ['what the whole passage is mostly about', 'the last word', 'one small fact', 'the name of the author'], a: 'what the whole passage is mostly about', e: 'Think big picture.' },
    { t: 'mc', q: 'Where can you often find the main idea?', c: ['in the first or last sentence', 'only in the middle', 'in the page number', 'in the pictures only'], a: 'in the first or last sentence', e: 'Writers often state it at the start or end.' },
  ]),
  U('fact-opinion', 'read', 'Fact or Opinion?', '🧐', [
    L('Can you prove it?', '<p>A <b>fact</b> can be proven true: <i>Water freezes at 0°C.</i></p><p>An <b>opinion</b> is what someone thinks or feels: <i>Winter is the best season.</i></p><p class="tip">Opinion clue words: <b>best, worst, favorite, beautiful, boring, should, I think</b>.</p>'),
  ], [
    { t: 'mc', q: 'Which is a fact?', c: ['Water freezes at 0°C.', 'Winter is the best season.', 'Snow is beautiful.', 'Cold days are boring.'], a: 'Water freezes at 0°C.', e: 'You can test and prove it.' },
    { t: 'mc', q: 'Which is an opinion?', c: ['Pizza is the tastiest food.', 'Pizza is made with dough.', 'Pizza can be baked in an oven.', 'Pizza often has cheese.'], a: 'Pizza is the tastiest food.', e: 'Tastiest is someone\'s feeling.' },
    { t: 'mc', q: '"Dogs have four legs."', c: ['fact', 'opinion'], a: 'fact', e: 'You can count them.' },
    { t: 'mc', q: '"Cats are better than dogs."', c: ['fact', 'opinion'], a: 'opinion', e: 'Better is a feeling - people disagree.' },
    { t: 'mc', q: 'A fact is something that...', c: ['can be proven true', 'someone feels', 'is always nice', 'is a guess'], a: 'can be proven true', e: 'Facts can be checked.' },
    { t: 'mc', q: 'Which word is a clue for an opinion?', c: ['best', 'measured', 'counted', 'dated'], a: 'best', e: 'Best is a judgment.' },
    { t: 'mc', q: '"The Pacific is the largest ocean."', c: ['fact', 'opinion'], a: 'fact', e: 'It can be measured.' },
    { t: 'mc', q: '"Math is the most fun subject."', c: ['fact', 'opinion'], a: 'opinion', e: 'Fun is a feeling (but we agree!).' },
  ]),
  U('paragraphs', 'read', 'Writing Great Paragraphs', '📝', [
    L('The paragraph sandwich', '<p>🍞 <b>Topic sentence</b> - tells the main idea.</p><p>🥬🧀🍅 <b>Supporting details</b> - 3 or more sentences with reasons, facts or examples.</p><p>🍞 <b>Concluding sentence</b> - wraps it up.</p>'),
    L('Transition words', '<p>Transitions help readers follow along.</p><ul><li>Order: <b>first, next, then, finally</b></li><li>Adding: <b>also, in addition, another</b></li><li>Contrast: <b>however, but, on the other hand</b></li><li>Example: <b>for example, for instance</b></li><li>Reason/result: <b>because, so, as a result</b></li></ul>'),
  ], [
    { t: 'mc', q: 'What is the job of a topic sentence?', c: ['tell the main idea of the paragraph', 'end the story', 'list every detail', 'ask a question'], a: 'tell the main idea of the paragraph', e: 'It is the top slice of bread.' },
    { t: 'mc', q: 'Best topic sentence for a paragraph about why dogs make great pets?', c: ['Dogs make wonderful pets for many reasons.', 'My dog is brown.', 'Some dogs bark.', 'I went to the park.'], a: 'Dogs make wonderful pets for many reasons.', e: 'It states the main idea.' },
    { t: 'mc', q: '"First, mix the flour. ___, add the eggs."', c: ['Next', 'However', 'Because', 'Although'], a: 'Next', e: 'Next shows order.' },
    { t: 'mc', q: 'Which transition shows a contrast?', c: ['however', 'also', 'first', 'finally'], a: 'however', e: 'However shows something different.' },
    { t: 'mc', q: 'Which transition introduces an example?', c: ['for example', 'finally', 'next', 'first'], a: 'for example', e: 'For example gives an example.' },
    { t: 'mc', q: 'A concluding sentence...', c: ['wraps up the paragraph', 'starts the paragraph', 'is always a question', 'begins a new topic'], a: 'wraps up the paragraph', e: 'The bottom slice of bread.' },
    { t: 'mc', q: 'Which sentence does NOT belong in a paragraph about recycling?', c: ['My favorite color is blue.', 'Recycling saves trees.', 'Plastic bottles can be reused.', 'Recycling reduces trash.'], a: 'My favorite color is blue.', e: 'It is off topic.' },
    { t: 'mc', q: '"___, put the cake in the oven." (last step)', c: ['Finally', 'First', 'For example', 'However'], a: 'Finally', e: 'Finally signals the last step.' },
  ]),
];

export const unitById = id => ENGLISH_UNITS.find(u => u.id === id);

export const cleanWord = w => w.replace(/[^\p{L}\p{N}'’-]/gu, '').replace(/’/g, "'");
export const normalizeText = s => String(s).trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
