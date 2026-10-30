---
title: "Open Information Extraction and Open Relation Extraction Papers"
id: "4edd62c571fb4b939946d7725fb25217"
slug: "open-information-extraction-and-open-relation-extraction-papers"
source_url: "https://adams-blog.notion.site/Open-Information-Extraction-and-Open-Relation-Extraction-Papers-4edd62c571fb4b939946d7725fb25217"
extracted_at: "2026-10-30T19:39:04.380Z"
cover: null
---

# Open Information Extraction and Open Relation Extraction Papers

<a id="7e90dd7431d945b6a5c6972168c13909"></a>

[https://github.com/NPCai/Open-IE-Papers](https://github.com/NPCai/Open-IE-Papers)

<a id="5a43f0385fd94bffb6bcc774208bcde2"></a>

![](/content-assets/f475420dc7133e1fd91d.png)

<a id="67155ecfb5d34304bd2c6ab5a15621c0"></a>

## Table of Contents

<a id="8240b9cc23044a3181765d44dce9e499"></a>

1. [General](https://github.com/NPCai/Open-IE-Papers#general)

<a id="41a66a078927428f960fa32e617bec03"></a>

1. [Literature Reviews](https://github.com/NPCai/Open-IE-Papers#reviews)

<a id="eacbf7aca46a4434a0b37348ee2bc9cd"></a>

1. [Papers - Neural Networks](https://github.com/NPCai/Open-IE-Papers#papers_nn)

<a id="5d8e10911a6b462189727512a2d2fc7f"></a>

1. [Papers - Parse-based and statistical](https://github.com/NPCai/Open-IE-Papers#papers_traditional)

<a id="afbca6ad85834f37801668703b1a1529"></a>

1. [Papers - Older papers and legacy systems](https://github.com/NPCai/Open-IE-Papers#papers_old)

<a id="7b8de42d8c7241cf9ad16ef89c8400d1"></a>

1. [Training and Testing Data](https://github.com/NPCai/Open-IE-Papers#data)

<a id="7e25e1d121be46d5943bcea9d4dfca85"></a>

### General

<a id="c127ee211e6f49dc9e63d95e2f066db5"></a>

This README containts OpenIE and ORE papers and resources. Summaries are by [@jbecke](https://github.com/jbecke) and [@TheodoreChristakis](https://github.com/TheodoreChristakis), to the best of our abilities after reading each paper or testing the system (when available). We welcome pull requests with additional resources, papers, or data.

<a id="4565c90c2baa480187556ba66fc9d81f"></a>

- [Wikipedia OpenIE](https://en.wikipedia.org/wiki/Open_information_extraction)

<a id="538e9dc0285b4d769c781468634edf34"></a>

### Literature Reviews

<a id="5072cc65be3341ad910fa556620ad5d5"></a>

- <a id="11fedb71345842ea882b4e6ad50116e9"></a>
  
  [A Survey on Open Information Extraction](https://arxiv.org/abs/1806.05599). Most up-to-date literature review (June 2018), convering non-neural network based approaches to OpenIE. Whereas I've classified by age in this document, the authors classify by method of extraction (learning-based, rule-based, clause-based, inter-propositional).

<a id="ac93a3c6b1de43e8b737114de4c740e2"></a>

- <a id="c9ac288094fe4ee89c4330ba347281e4"></a>
  
  [Creating a Large Benchmark for Open Information Extraction](http://www.aclweb.org/anthology/D16-1252): summarizes the field and creates a benchmark for OpenIE systems and creates the first large benchmark dataset (note: not large enough to train NN's).

<a id="c4c529024434454fa9ef591585fcf913"></a>

- <a id="049c6844d7cc43e3839008445561b72f"></a>
  
  [Effectiveness and Efficiency of Open Relation Extraction](http://www.anthology.aclweb.org/D/D13/D13-1043.pdf): Review of the limited work done in the field of ORE (open relation extraction).

<a id="61fa7a671d4d4f99a04714ec1cac08d0"></a>

### Papers - Neural Networks

<a id="87847b55832c442c9ae46880e0aa1c99"></a>

- <a id="eec66a10f58b4a17b0881399ca96ae23"></a>
  
  [Neural Open Information Extraction](https://arxiv.org/pdf/1805.04270.pdf): AFAIK, the first use of ANNs (seq2seq with attention) applied to OpenIE. Author bootstrapped tuples from high-confidence OpenIE-4 and makes the data available. However, the data isn't very clean; a quick glance shows a lot of malformed/incorrect tuples.

<a id="df8e47159a234afaacf7e746d5df5970"></a>

- <a id="04c414610f064f82afb24bfd135a2aec"></a>
  
  [Supervised Open Information Extraction](http://aclweb.org/anthology/N18-1081): expands on the idea of turning QA datasets into OpenIE datasets. Trains an ANN with using an interesting feature representation, uses seq2seq model to generate BIO tags and then creates tuples from that using a deterministic algorithm.

<a id="2c2f9a91e1774935b93c4e210b39307e"></a>

- <a id="708d1c0656574469abc06338ca6d2a8e"></a>
  
  [Supervised Neural Models Revitalize the Open Relation Extraction](https://arxiv.org/pdf/1809.09408.pdf): tagging scheme similar to above paper, but uses a mixture of BiLSTM, CNN, and CRF and displays promising results.

<a id="6c6982a6caa74a57a0ea602a6d4c7757"></a>

- <a id="8d87219f7d564f87b9c68196f48a78e0"></a>
  
  [Open Information Extraction from Question-Answer Pairs](https://arxiv.org/pdf/1903.00172v1.pdf) neural network to extract OpenIE tuples from conversation-based QA datasets.

<a id="a314d2774c3d4ca587a291e8a8592720"></a>

- [Learning Open Information Extraction of Implicit Relations from Reading Comprehension Datasets](https://arxiv.org/abs/1905.07471) extracting more implied ("common sense") relations.

<a id="63de0b2ea2d549fb947a4776d606afd2"></a>

### Papers - Parse-based and statistical

<a id="21a47996c8594ed1823524e1cb647907"></a>

- [Graphene](https://www.researchgate.net/publication/325734922_Graphene_Semantically-Linked_Propositions_in_Open_Information_Extraction?enrichId=rgreq-810ff916f1de8d82406f9bc1738f5f61-XXX&enrichSource=Y292ZXJQYWdlOzMyNTczNDkyMjtBUzo2MzY5NTQ2MzkwODU1NzFAMTUyODg3MzIyODAxNg%3D%3D&el=1_x_3&_esc=publicationCoverPdf) generates n-ary extractions with semantically linking-labels like "TEMPORAL", "CAUSE", etc. as well as open relations

<a id="d10bc4eda54640c19b53c123d00b7001"></a>

- [Stanford Open IE](https://nlp.stanford.edu/software/openie.html): produces maximally-shortened tuples. It seems to often produce tuples for which the reported confidience is often 1.0. GPL or proprietary available as part of [Stanford Core NLP](https://stanfordnlp.github.io/CoreNLP/).

<a id="47e2a198cbce4e7f910564fbae422771"></a>

- [OpenIE-X](https://knowitall.github.io/openie/) ([v4](https://github.com/knowitall/openie), [v5](https://github.com/dair-iitd/OpenIE-standalone), [allen institute version](https://github.com/allenai/openie-standalone)). Works well with simple statements (see examples [in this dataset](http://data.allenai.org/tuple-ie/)). Outputs context for extractions and gives good confidence predictions that can be used to balance precision-recall. Note the restrictive license (research purposes only).

<a id="3c13c70fa1cb45feafa5b6346e6747b7"></a>

- [Open Relation Extraction and Grounding](http://aclweb.org/anthology/I17-1086): Extracts argument pairs of relation tuples and forms weighted dependency trees between two arguments. It shows promising results in determining relative importance of each argument in the tree.

<a id="a4bb5c826c3c401ea17493e87035204f"></a>

- [Unsupervised Open Relation Extraction](https://arxiv.org/pdf/1801.07174.pdf): Used for unsupervised relation extraction from free text by using pretrained word embeddings while using a sentence's dependency parse tree as a foundation.

<a id="81a4eb419b534e1d9618d2adafb848fd"></a>

### Papers - Older papers and legacy systems

<a id="b89beed626974ceb87d1e561abcd128e"></a>

- From University of Washington
  
  <a id="71e0094168ba40febe272ecdff98a52c"></a>
  
  - [TextRunner](http://turing.cs.washington.edu/papers/ijcai07.pdf) - One of the earliest papers addressing open information extraction
  
  <a id="76d240188a55480d940658103dd5bd35"></a>
  
  - [Reverb](http://reverb.cs.washington.edu/) - Improved the extraction to better form the tuple of (argument, relation, argument)
  
  <a id="20622ddb62a04db896b2d332cba6cae4"></a>
  
  - [OLLIE](https://knowitall.github.io/ollie/) - Addressed the issue of misleading propositions and non-verb mediated relations

<a id="f8594c8ce3d64daa9a1e34e9c4ed1374"></a>

- [CSD-IE](https://ieeexplore.ieee.org/document/6693511/) - Generation of nested contractions which is especially effective in sentences using subordinating clauses

<a id="820f5594cd05444c82292e4207eba84f"></a>

- [PropS](http://u.cs.biu.ac.il/~stanovg/props.html): Syntax Based Proposition Extraction

<a id="5a27b2619ac2498c8aa005ddbc2ed966"></a>

- [ClausIE](https://www.mpi-inf.mpg.de/departments/databases-and-information-systems/software/clausie/) - Formed a strong relation between grammatical clauses, propositions, and OIE extractions by defining seven grammatical patterns

<a id="4660983b452144e2ab4b0b31c441dc66"></a>

- [ReNoun](http://www.aclweb.org/anthology/D14-1038) - Used predominantly for noun-mediated relations.

<a id="2a6fc7b2c5384b788ad1c79d17b9f1cd"></a>

### Training and Testing Data

<a id="d5ac2fcb3ef64adb9ec7b1676dd5c4ff"></a>

- [35M sentence-tuple pairs](https://onedrive.live.com/?cid=c826c2d6f4c7d993&id=C826C2D6F4C7D993%213193&authkey=!AHj1kHDE5TSS0e8): from the paper [Neural Open Information Extraction](https://arxiv.org/pdf/1805.04270.pdf). It was generated by OpenIE-4, removing any tuples less then 0.9 confidence. Because there is no sample data, I've copied a bit below. As you can see, the data is somewhat noisy. It *might* be useful for extra training data, but not as a gold dataset.

<a id="aebae1222a7a4ea190a14e83ce6374b3"></a>

```
* moving and handling '' ' - a comprehensive course that covers safe handling and transport of casualties .
<arg1> '' ' - a comprehensive course </arg1> <rel> covers </rel> <arg2> safe handling and transport of casualties </arg2>

this word , adjectival magavan meaning `` possessing maga - '' , was once the premise that avestan maga - and median magu - were co-eval .
<arg1> - '' , was once the premise that avestan maga - and median magu - </arg1> <rel> were </rel> <arg2> co-eval </arg2>

melora walters as candy ' - a hooker who works for the motel where john person is staying , as a complimentary service to the guests .
<arg1> ' - a hooker </arg1> <rel> works </rel> <arg2> for the motel </arg2>

- - a hunter who uses bows and arrows instead of guns .
<arg1> - - a hunter </arg1> <rel> uses </rel> <arg2> bows and arrows instead of guns </arg2>
​
```

<a id="518a1b4a26294cf09790786ad8ddd96d"></a>

- [TupleInf Open IE Dataset](http://data.allenai.org/tuple-ie/): OpenIE-4 extractions of 8th grade and 4th grade questions. By inspection, these tend to be cleaner than the above dataset because of the simplicity of the language. Confidence-values are retained so you can make your own tradeoff between precision and recall. Note suitable for a gold dataset.

<a id="b5668e3817a44dc0997af3c3915925df"></a>

```
01 April 1969 The ATM would be a manned solar observatory making measurements of the Sun by telescopes and instruments above
0.96 (The ATM; would be; a manned solar observatory making measurements of the Sun by telescopes and instruments)
0.93 (a manned solar observatory; making; measurements of the Sun)

01 April 1969 The ATM would be a manned solar observatory making measurements of the Sun by telescopes and instruments above the Earth's atmosphere.
0.96 (The ATM; would be; a manned solar observatory making measurements of the Sun by telescopes and instruments above the Earth's atmosphere)
0.93 (a manned solar observatory; making; measurements of the Sun)

01 - Compare the physical properties of ice, liquid, water, and vapor.

01 Earthly Seasons PURPOSE: To show that the seasons are the consequence of the tilt of earth.

0.1% water can lower the melting temperature of peridotite by 100 C.
0.91 (0.1% water; can lower; the melting temperature of peridotite)

( 020 ) Celsius &#176;C The international temperature scale where water freezes at 0 (degrees) and boils at 100 (degrees).
0.89 (water; freezes; at 0 (degrees)
​
```

<a id="a154deb1efa74c78806a7c09f6929ab1"></a>

- [Squadie](https://github.com/NPCai/Squadie) (not yet published, expect changes): this is our dataset derived from Squad. It uses a similar JSON format to SQuAD and contains 50,000 tuples. This tuple can then be matched with the corresponding sentence in the training corpus. Not suitable as a gold corpus. Squadie is useful for extracting implied relations. We have also converted Maluuba NewsQA.

<a id="1d1fbf2765ea48489d86fa146065a300"></a>

```
 {
 "question": "Which film did Beyoncé star in 2001 with Mekhi Phifer?",
 "id": "56d4831f2ccc5a1400d83155",
 "answer": "Carmen: A Hip Hopera",
 "tuple": "<Which film\tdid Beyoncé star with Mekhi Phifer\tCarmen: A Hip Hopera>"
 },
 {
 "question": "What was the name of Destiny Child's third album?",
 "id": "56d4831f2ccc5a1400d83156",
 "answer": "Survivor",
 "tuple": "<Survivor\tthe name of\tDestiny Child 's third album>"
 },
 {
 "question": "Who filed a lawsuit over Survivor?",
 "id": "56d4831f2ccc5a1400d83157",
 "answer": "Luckett and Roberson",
 "tuple": "<Luckett and Roberson\tfiled a lawsuit over\tSurvivor>"
 },
 {
 "question": "When did Destiny's Child announce their hiatus?",
 "id": "56d4831f2ccc5a1400d83158",
 "answer": "October 2001",
 "tuple": "<Destiny 's Child\tannounce their hiatus\tOctober 2001>"
 }
​
```
