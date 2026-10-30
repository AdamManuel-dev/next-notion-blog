---
title: "Schema Design"
id: "ccfd837bc3fe4ecbb9c02fcc58fdaa5e"
slug: "schema-design"
source_url: "https://adams-blog.notion.site/Schema-Design-ccfd837bc3fe4ecbb9c02fcc58fdaa5e"
extracted_at: "2026-10-30T19:39:47.032Z"
cover: null
---

# Schema Design

<a id="72b1cc54375a4d968c5bdf863aea78ab"></a>

## Relationship based Strategies

<a id="25788ad3071649eb8274c2595874e540"></a>

- **One-to-One** - Prefer key value pairs within the document

<a id="27450893f34c4ca39d398842ebc3d350"></a>

- **One-to-Few** - Prefer embedding

<a id="20c1b156d7414b84bf5668a46fc030aa"></a>

- **One-to-Many** - Prefer embedding

<a id="2f4a186bdd1e4164ad43ce4eb46c8e48"></a>

- **One-to-Squillions** - Prefer Referencing

<a id="d4ff4b82d37d4ecabdc6a8201ae8114e"></a>

- **Many-to-Many** - Prefer Referencing

<a id="03bd7618d45342b6a41febb54a92f5fc"></a>

## General Rules for MongoDB Schema Design

<a id="f2bcebe6b8864df2a566b5d77de0729b"></a>

- **Rule 1**: Favor embedding unless there is a compelling reason not to.

<a id="3d5277e2debf4214a53ce86065b52b5c"></a>

- **Rule 2**: Needing to access an object on its own is a compelling reason not to embed it.

<a id="d71e865827a34384ac319a9e12290ee2"></a>

- **Rule 3**: Avoid joins and lookups if possible, but don't be afraid if they can provide a better schema design.

<a id="417f24cc2bd0492c8613e1fe88557bed"></a>

- **Rule 4**: Arrays should not grow without bound. If there are more than a couple of hundred documents on the *many* side, don't embed them; if there are more than a few thousand documents on the *many* side, don't use an array of ObjectID references. High-cardinality arrays are a compelling reason not to embed.

<a id="eee632c5b22348ee816530c6afa39ab0"></a>

- **Rule 5**: As always, with MongoDB, how you model your data depends **entirely** on your particular application's data access patterns. You want to structure your data to match the ways that your application queries and updates it.

<a id="2198f2e88aa7414a9212757282e479b8"></a>

## Anti-Patterns

<a id="489d513fb4d945c8b451ddb74ec04937"></a>

Below is a brief description of each of the schema design anti-patterns we've covered in this series.

<a id="38049d0d60b64c8d8aa2aa83c4978916"></a>

- [Massive arrays](https://www.mongodb.com/developer/article/schema-design-anti-pattern-massive-arrays/): storing massive, unbounded arrays in your documents.

<a id="402c7df06cd946e296d94e6f451d12cf"></a>

- [Massive number of collections](https://www.mongodb.com/developer/article/schema-design-anti-pattern-massive-number-collections/): storing a massive number of collections (especially if they are unused or unnecessary) in your database.

<a id="bdda54353d8b4bc1b96b1795386a2a3a"></a>

- [Unnecessary indexes](https://www.mongodb.com/developer/article/schema-design-anti-pattern-unnecessary-indexes/): storing an index that is unnecessary because it is (1) rarely used if at all or (2) redundant because another compound index covers it.

<a id="6a0e911b419e4d14bb82eca07fd81aa0"></a>

- [Bloated documents](https://www.mongodb.com/developer/article/schema-design-anti-pattern-bloated-documents/): storing large amounts of data together in a document when that data is not frequently accessed together.

<a id="d71b9ed3040145f39fccf7ea4a25cfa1"></a>

- [Separating data that is accessed together](https://www.mongodb.com/developer/article/schema-design-anti-pattern-separating-data/): separating data between different documents and collections that is frequently accessed together.

<a id="c47c2d9a043c4503a66fce1fdda75cbd"></a>

- [Case-insensitive queries without case-insensitive indexes](https://www.mongodb.com/developer/article/schema-design-anti-pattern-case-insensitive-query-index/): frequently executing a case-insensitive query without having a case-insensitive index to cover it.

<a id="b8c67df4b7b048508d1b4321ee3fc4b6"></a>

## Recomended Patterns

<a id="1d63bfa6adaa44c897b3bebd382c1116"></a>

### Read Ratio to Write Ratio ​

<a id="66047008e75b4373b3952a84fec9ba8e"></a>

Determining if your application is read heavy or write heavy will lead to how you design your schema. If your application is read heavy, you might want to choose a schema that minimizes the amount of reads from MongoDB.

<a id="8e22238fb833484ca4a8602917bd16be"></a>

As an example consider an auction type website. As most operations are read operations caused by people browsing the catalog, it might makes sense to use a denormalized schema for the product including as much relevant information as needed to render the entire product page.

<a id="0fcb81d8b0f54a61a6fc3e170cf258fc"></a>

Similarly if your application is write heavy, you might want to ensure that you use a schema that maximizes MongoDB write throughput.

<a id="6a6748c916b2423db1b232e208028b71"></a>

### Avoid Application Joins ​

<a id="f667f8904eac4ca78f134d224d341b90"></a>

MongoDB does not support server side joins. All joins have to be performed in the application itself. The performance can suffer if you are pulling back and joining a lot of data due to all the round-trips required to bring back all the data and the time it takes to perform the in application join. If you find your schema is depending on a lot of joins, it might make sense to denormalize the schema in order to reduce the number of joins.

<a id="acc9b83855024f98b3a008edbacd8f4d"></a>

### Pre-aggregate Data ​

<a id="0cf1d08dfe3f4a13a3b1d2875b5dea8a"></a>

Additionally, if you find you are aggregating data in a lot of application queries, you might want to consider pre-aggregating. One example might be a page view counter. Instead of summing up the number of views for a particular page on request, we can increment a view counter for that page each time the page is viewed and use this counter to show the number of page views.

<a id="092d89b8d0834dd99c275fbcade01cc0"></a>

### Avoid Growing Documents (MMAP) ​

<a id="7ab8a7d800a94c3cadb22a35645451a6"></a>

If, you find that your schema design creates documents that are constantly growing in size, it will have impact on your disk IO and database performance. Using document buckets and document pre-allocation will help address the issues for the MMAP storage engine.

<a id="981891d581ee4f6991dc3dc7836c8449"></a>

### Avoid Updating Whole Documents (MMAP) ​

<a id="2d227e0d1a49494591999f6b4ecc71a6"></a>

MongoDB provides for atomic operators that let you modify fields in an existing document, and in most cases will cause an in-place update when using the MMAP storage engine. This ensures we spend as little time as possible re-allocating documents in memory and improves write performance.

<a id="77b4f638218847f5a8bbfe7d00e63c86"></a>

### Pre-allocated Documents (MMAP) ​

<a id="fe41a30df16845d5862d23fbb511b89c"></a>

If your schema grows to a known size you can avoid document moves by pre-allocating the maximum size of the document causing all operations on the document to be in-place updates.

<a id="d63948d0f16a4933ae7f37717ef8eff8"></a>

### Field Names Take up Space (MMAP) ​

<a id="ff503de64049450b9d2b7d664eff1236"></a>

In some cases documents can contain more space allocated for the field names than the actual data stored. For this case you may want to consider compressing your field names if you are using MMAP or switch to using WiredTiger that supports compression using snappy or zlib.

<a id="07f0b0bc56344a838e6bf518fc5fd5bf"></a>

### Over Eager Indexing ​

<a id="fc64361f934741a6a7d28cdd176ebc28"></a>

You might get tempted to add all kinds of indexes to your schema. You have to keep in mind, that each index will impact performance, as they will need to be updated when documents change and the more indexes you have on a collection the more overhead there will be for each write operation. Each index also takes up space and memory so keep in mind that over eager indexing can cause your storage size to balloon.

<a id="03004244f6464ef89606dbe3edac1647"></a>

### Custom \_id Field ​

<a id="71561cdcc9f64c699db920135a9f4f05"></a>

You can save some space and additional indexes by overriding the meaning of the \_id field. The only requirement is that \_id is a unique field for the collection. For example you might have a structure that contains a timestamp, userid and machineid allowing you to use the \_id index to query for those fields without having to create an additional index.

<a id="d90fa11c066742628c95d1ba58da73a9"></a>

### Covered Indexes ​

<a id="5a921b94417f4ff282413b2ce784d981"></a>

If your application can leverage covered indexes, it might help performance given that a query might be completely answerable using the data stored in the index without materializing the underlying documents.

<a id="c18ec13dec054be5bd79eb41c2fd76a4"></a>

![](/content-assets/0f12f539b6cc1fb4c7a9.png)
