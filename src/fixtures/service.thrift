namespace js test

const string test = 'test'

struct CorgiStruct {
	1: optional string name
	2: optional i32 age
	3: optional i64 weight
	4: optional string color	
	5: bool is_cute = true
}

struct MyStruct {
	1: optional string test
	2: optional i32 test2
	3: optional list<CorgiStruct> corgis
}

service MyService {
	void ping()
}