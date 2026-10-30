---
title: "Foundational Distributed Systems Papers"
id: "d1087b507c7c40ae90ab51c7a65fa7b3"
slug: "foundational-distributed-systems-papers"
source_url: "https://adams-blog.notion.site/Foundational-Distributed-Systems-Papers-d1087b507c7c40ae90ab51c7a65fa7b3"
extracted_at: "2026-10-30T19:38:58.256Z"
cover: null
---

# Foundational Distributed Systems Papers

<a id="565510a473c14110b26b3461115a0a18"></a>

<details open=""><summary>Original Source</summary><section id="996c97a1f11a4bc7a545eae44da3d74a"><p><a href="http://muratbuffalo.blogspot.com/2021/02/foundational-distributed-systems-papers.html">http://muratbuffalo.blogspot.com/2021/02/foundational-distributed-systems-papers.html</a></p></section></details>

<a id="0e7c3500b10742659d2d9873977c9d84"></a>

* * *

<a id="11c257b67a4944e6bc036c37f6b7e684"></a>

* * *

<a id="4a394da0530f4e259199e9de6ed52551"></a>

I talked about [the importance of reading foundational papers](http://muratbuffalo.blogspot.com/2021/02/read-papers-not-too-much-mostly.html) last week. To followup, here is my compilation of foundational papers in the distributed systems area. (I focused on the core distributed systems area, and did not cover networking, security, distributed ledgers, verification work etc. I even left out distributed transactions, I hope to cover them at a later date.)

<a id="03c5547fbd91463d83cdfbc8331c6701"></a>

I classified the papers by subject, and listed them in chronological order. I also listed expository papers and blog posts at the end of each section.

<a id="22673b3c311547438dae53101f35c025"></a>

## Time and State in Distributed Systems

<a id="f8759b6853c345c5ad62d71945971ab5"></a>

[Time, Clocks, and the Ordering of Events in a Distributed System.](https://lamport.azurewebsites.net/pubs/time-clocks.pdf) Leslie Lamport, Commn. of the ACM,  1978.

<a id="f22698079da54345a03a109964da0d0c"></a>

[Distributed Snapshots: Determining Global States of a Distributed System.](https://lamport.azurewebsites.net/pubs/chandy.pdf) K. Mani Chandy Leslie Lamport, ACM Transactions on Computer Systems, 1985.

<a id="831b8a77ed8543e880dedb80d1e552eb"></a>

[Virtual Time and Global States of Distributed Systems.](https://pages.cs.wisc.edu/~remzi/Classes/739/Fall2016/Papers/mattern89.pdf) Mattern, F. 1988.

<a id="8e4ac914c9684de8a643f766854d5be9"></a>

#### Expository papers and blog posts

<a id="a0c4fc7ad91d4407be292277938475e8"></a>

[There is No Now](https://queue.acm.org/detail.cfm?id=2745385). Justin Sheehy, ACM Queue 2015

<a id="cac3604e90e546299bbf0c0fa4942de2"></a>

[Why Logical Clocks are Easy](https://queue.acm.org/detail.cfm?id=2917756). Carlos Baquero and Nuno Preguiça, ACM Queue 2016.

<a id="6c28745b5b104caeb7f2a5b516557281"></a>

[Hybrid logical clocks](http://muratbuffalo.blogspot.com/2014/07/hybrid-logical-clocks.html)

<a id="6c847694adf54117b9f64200d389f993"></a>

[Logical clocks and Vector clocks modeling in TLA+/PlusCal](http://muratbuffalo.blogspot.com/2018/01/logical-clocks-and-vector-clocks.html)

<a id="cf9270e46fbe4c85941efa10b24f3f3d"></a>

## Impossibility results

<a id="36854addcd0048688dd3b0fa3939716d"></a>

[Coordinated Attack or Two Generals problem](https://en.wikipedia.org/wiki/Two_Generals%27_Problem) is a fundamental impossibility in distributed systems. It started more of folks theorem, so instead of pointing to a paper, I provide a link to the wikipedia page.

<a id="e50eb458a6dc4375ba3a85b0fd887b89"></a>

[Impossibility of Distributed Consensus with One Faulty Process](https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf), Fischer, Lynch and Patterson, JACM, 1985

<a id="adeb1c1e3fd141d58cccc95b309b094f"></a>

[Unreliable Failure Detectors for Reliable Distributed Systems](https://www.cs.utexas.edu/~lorenzo/corsi/cs380d/papers/p225-chandra.pdf), Tushar Deepak Chandra and Sam Toueg, Journal of the ACM, 1996.

<a id="d0bf9b1f85554137b2d59a84b088f487"></a>

[Harvest, Yield, and Scalable Tolerant Systems](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.24.3690&rep=rep1&type=pdf), Armando Fox, Eric A. Brewer, 1999

<a id="c27003647d6d40139a4d8bccd49eb229"></a>

[CAP Twelve years later: How the rules have changed,](https://sites.cs.ucsb.edu/~rich/class/cs293b-cloud/papers/brewer-cap.pdf) Eric Brewer, 2012.

<a id="b8430d63e436405a91e45c4e8d4ca193"></a>

#### Expository papers and blog posts

<a id="6d12d30bd8d94a59a6807b4fb10dd5f2"></a>

[A Brief Tour of FLP Impossibility](http://the-paper-trail.org/blog/a-brief-tour-of-flp-impossibility/)

<a id="c9733174f975454e9c1c4ba5aac99664"></a>

[Paper summary: Perspectives on the CAP theorem](http://muratbuffalo.blogspot.com/2015/02/paper-summary-perspectives-on-cap.html)

<a id="134e4c71b6aa44219e463d0a918e249c"></a>

## Consensus and state machine replication

<a id="03824c3404d9493588e79ad053e30bd8"></a>

[Viewstamped Replication: A New Primary Copy Method to Support Highly-Available Distributed Systems.](http://pmg.csail.mit.edu/papers/vr.pdf) B. Oki and B. Liskov. SOSP 1988

<a id="d8ba271b9890464d972f3440559f8149"></a>

[Implementing Fault-Tolerant Services Using the State Machine Approach: a Tutorial](https://www.cs.cornell.edu/fbs/publications/smsurvey.pdf), Fred Schneider, 1990

<a id="4029ebca1cd14019804225d8b57218cd"></a>

[How to build a highly available system with consensus,](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.61.8330&rep=rep1&type=pdf) Butler Lampson, 1996

<a id="bb524f689def4975acd24ce379da4cd2"></a>

[The Part-Time Parliament (Paxos)](https://lamport.azurewebsites.net/pubs/lamport-paxos.pdf) Leslie Lamport, 1998. ([See context](https://www.microsoft.com/en-us/research/publication/part-time-parliament/))

<a id="060994dfec4449e3b4ae11165e955aed"></a>

[Practical Byzantine Fault Tolerance.](http://pmg.csail.mit.edu/papers/osdi99.pdf) Miguel Castro, Barbara Liskov. OSDI 1999.

<a id="93466c4d180f4304afd0fa4d43976d88"></a>

[Chain Replication for Supporting High Throughput and Availability](https://www.cs.cornell.edu/home/rvr/papers/OSDI04.pdf). Robbert van Renesse and Fred B. Schneider, OSDI 2004.

<a id="8e909031e96546889a9c866602fae256"></a>

[ZooKeeper: Wait-free coordination for Internet-scale systems](https://www.usenix.org/legacy/event/atc10/tech/full_papers/Hunt.pdf). Patrick Hunt, Mahadev Konar, Flavio P. Junqueira, Benjamin Reed, Usenix ATC 2010.

<a id="1275262bba6747b896283cf03e9b5f0c"></a>

[Tango: Distributed Data Structures over a Shared Log](https://dl.acm.org/doi/10.1145/2517349.2522732), Mahesh Balakrishnan, Dahlia Malkhi, Ted Wobber, Ming Wu, Vijayan Prabhakaran, Michael Wei, John D. Davis, Sriram Rao, Tao Zou, Aviad Zuckk. SOSP 2013.

<a id="c0a5cd6adc084bfc8204f0bfbdce0e4f"></a>

[There is more consensus in Egalitarian parliaments](https://dl.acm.org/doi/10.1145/2517349.2517350). Iulian Moraru, David G. Andersen, Michael Kaminsky, SOSP 2013.

<a id="368dad5b4af14469a9aa831f602f69ae"></a>

[Flexible Paxos: Quorum intersection revisited.](https://arxiv.org/abs/1608.06696) Heidi Howard, Dahlia Malkhi, Alexander Spiegelman. 2016.

<a id="950a67cf165f4b3da8769fb6a15ccf61"></a>

[WormSpace: A modular foundation for simple, verifiable distributed systems.](https://flint.cs.yale.edu/flint/publications/socc19.pdf) Ji-Yong Shin, Jieung Kim, Wolf Honore, Hernán Vanzetto, Srihari Radhakrishnan, Mahesh Balakrishnan, Zhong Shao, SOCC'19.

<a id="00c63fd7bcae49b6a79ffdbf709af655"></a>

#### Expository papers and blog posts

<a id="588b6918cd2e4734bc538642418383cf"></a>

[In Search of an Understandable Consensus Algorithm.](https://raft.github.io/raft.pdf) Diego Ongaro, John Ousterhout, Usenix ATC, 2014.

<a id="6bcf85fa1ea54abebecb9f274ee579fe"></a>

[Paxos Made Moderately Complex](https://www.cs.cornell.edu/courses/cs7412/2011sp/paxos.pdf). Robbert Van Renesse and Deniz Altinbuken, ACM Computing Surveys, 2015.

<a id="6fed1ebf9c2a4176982a5fcc9456530f"></a>

[Consensus in the Cloud: Paxos Systems Demystified](https://cse.buffalo.edu/tech-reports/2016-02.orig.pdf). Ailidani Ailijiang, Aleksey Charapko, Murat Demirbas, 2016.

<a id="d76b03ca4d604f0a98acd3eb1016f988"></a>

[Modeling Paxos and Flexible Paxos in Pluscal and TLA+](http://muratbuffalo.blogspot.com/2016/11/modeling-paxos-and-flexible-paxos-in.html)

<a id="defadac5e163427e84480b63c3384416"></a>

[Dissecting performance bottlenecks of Paxos protocols.](http://muratbuffalo.blogspot.com/2019/07/dissecting-performance-bottlenecks-of.html)

<a id="8bf55d08d3704d88bbb2ed07e447aa1c"></a>

## Distributed algorithms

<a id="c0b8b033f2434b3183b86907b371e272"></a>

[Self-stabilizing systems in spite of distributed control](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.93.314&rep=rep1&type=pdf), Edsgar W. Dijkstra, CACM 1974.

<a id="20cd7a4d9f0f41c6b519fa1fdabd419c"></a>

[The Drinking Philosophers Problem](https://www.cs.utexas.edu/users/misra/scannedPdf.dir/DrinkingPhil.pdf), K. M. Chandy, J. Misra, ACM TOPLAS 1984

<a id="b2b5404c261040a7959b2b6fa70d55fe"></a>

[Sparse partitions](http://courses.csail.mit.edu/6.895/fall02/papers/Awerbuch/focs90.pdf), Baruch Awerbuch, David Peleg, FOCS 1990.

<a id="3d94f1032c484e4dac228b6cca83b09c"></a>

[Distributed reset](http://web.cse.ohio-state.edu/siefast/group/publications/distributed-reset.pdf), Anish Arora, Mohamed Gouda, 1994

<a id="a2ed6c07713e4b9083975396c1b8c64e"></a>

[The Arrow Distributed Directory Protocol](http://cs.brown.edu/people/mph/DemmerH98/disc.pdf), Michael J. Demmer, M. Herlihy, DISC 1998.

<a id="0631c1767b6044e090fcf748810531ba"></a>

#### Expository papers and blog posts

<a id="87535b5cef664980b663bda35e7d3ade"></a>

[Dijkstra's stabilizing token ring algorithm](http://muratbuffalo.blogspot.com/2015/01/dijkstras-stabilizing-token-ring.html)

<a id="82ac6bbf033e4b2c963bec387f05ebcd"></a>

[Modeling the hygienic dining philosophers algorithm in TLA+](http://muratbuffalo.blogspot.com/2016/11/hygienic-dining-philosophers.html)

<a id="84126c9191f1498bb17dcf4f3bb7aafa"></a>

## Miscellaneous

<a id="b18975b34b9747e5b2bb70c5fd6f2fcf"></a>

[Hints for computer system design](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/acrobat-17.pdf), Butler Lampson, 1983

<a id="a82d91484ad541928f7767d40c811545"></a>

[The role of distributed state](https://courses.cs.washington.edu/courses/cse552/07sp/papers/distributed_state.pdf), John Ousterhout, 1990

<a id="bc766d25d1564e019c92b023d836c2b2"></a>

[SEDA: An Architecture for Well-Conditioned, Scalable Internet Services](http://www.sosp.org/2001/papers/welsh.pdf). Matt Welsh, David Culler, and Eric Brewer, SOSP 2001

<a id="65e50c9f7571456b8457524061c3906c"></a>

[Crash only software](http://usenix.org/events/hotos03/tech/full_papers/candea/candea.pdf), George Candea, Armando Fox, HotOS 2003

<a id="906f720eb1694e86b949926f60b2497d"></a>

#### Expository papers and blog posts

<a id="cccf3fec522542b4b41348c0d8b2cea9"></a>

[Learning about distributed systems: where to start?](http://muratbuffalo.blogspot.com/2020/06/learning-about-distributed-systems.html)

<a id="8ca79ac23f494c62bb7b43ebf00a32f4"></a>

## Cloud computing, big data storage/processing

<a id="00f2983b782d4c37aaa99401063a8a35"></a>

[Lessons from Giant-Scale Services](https://courses.cs.washington.edu/courses/cse454/05sp/papers/GiantScale-IEEE.pdf). Eric A. Brewer, IEEE Internet Computing, 2001.

<a id="c07823c50d374b6bb1deb284d1ef9a0e"></a>

[MapReduce: Simplified Data Processing on Large Clusters](https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf). Jeffrey Dean and Sanjay Ghemawat, OSDI 2004.

<a id="5086230f869b495da979f65da125bd69"></a>

[Optimistic Replication](https://dsf.berkeley.edu/cs286/papers/optimistic-csur2005.pdf), Yasushi Saito and Marc Shapiro, 2005.

<a id="72a642b9482a47158c8b6b97ffd31354"></a>

[Dynamo: Amazon’s Highly Available Key-Value Store](https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html). Giuseppe DeCandia, Deniz Hastorun, Madan Jampani, Gunavardhan Kakulapati, Avinash Lakshman, Alex Pilchin, Swaminathan Sivasubramanian, Peter Vosshall and Werner Vogels, ACM SIGOPS 2007.

<a id="6a17edbb5d044ea683eb9bcde05e78ba"></a>

[On designing and deploying Internet scale services](https://mvdirona.com/jrh/talksAndPapers/JamesRH_Lisa.pdf), James Hamilton, LISA 2007

<a id="1a409753ccf14b608fd563405b96b5e8"></a>

[Life beyond Distributed Transactions: an Apostate's Opinion](https://www.ics.uci.edu/~cs223/papers/cidr07p15.pdf), Pat Helland, CIDR 2007.

<a id="90dce559c5d34507b0832f2efdf54321"></a>

[Conflict-free Replicated Data Types](https://hal.inria.fr/inria-00609399v2/document). Marc Shapiro, Nuno Preguiça, Carlos Baquero, Marek Zawirski, 2011.

<a id="b0f2e55e4f514331acc7a26768fec4a4"></a>

[Consistency Analysis in Bloom: a CALM and Collected Approach](https://people.ucsc.edu/~palvaro/cidr11.pdf), Peter Alvaro, Neil Conway, Joseph M. Hellerstein, William R. Marczak, CIDR 2011.

<a id="ce830910aed7436d973ccd5d03b0cfc0"></a>

[Resilient Distributed Datasets: A Fault-Tolerant Abstraction for In-Memory Cluster Computing](https://www.usenix.org/system/files/conference/nsdi12/nsdi12-final138.pdf). Matei Zaharia, Mosharaf Chowdhury, Tathagata Das, Ankur Dave, Justin Ma, Murphy McCauley, Michael J. Franklin, Scott Shenker, Ion Stoica. NSDI 2012.

<a id="870960816ddb4f9f971857c1d9a26268"></a>

[Tail at scale](https://cacm.acm.org/magazines/2013/2/160173-the-tail-at-scale/fulltext). Jeff Dean, Luiz Andre Barroso, Commn of the ACM, 2013.

<a id="1b2af276964c495f956a051646e96509"></a>

[Spanner: Google’s Globally Distributed Database](https://dl.acm.org/doi/pdf/10.1145/2491245), ACM, 2013.

<a id="483317d7be6a4bee8c6e3d00a87dc70d"></a>

[TensorFlow: A System for Large-Scale Machine Learning](https://www.usenix.org/conference/osdi16/technical-sessions/presentation/abadi), OSDI 2016.

<a id="19ece6cc2d64419ca5417ff5022cb801"></a>

#### Expository papers

<a id="db26a549152840af9e7f109e106f835e"></a>

[Above the Clouds: A Berkeley View of Cloud Computing](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2009/EECS-2009-28.pdf). Michael Armbrust, Armando Fox, Rean Griffith, Anthony D. Joseph, Randy H. Katz, Andrew Konwinski, Gunho Lee, David A. Patterson, Ariel Rabkin, Ion Stoica, Matei Zaharia, 2009.

<a id="b7b02a3c112d47f286a9c0a1dbbe091c"></a>

[Cloud Programming Simplified: A Berkeley View on Serverless Computing](https://arxiv.org/abs/1902.03383), 2019.
