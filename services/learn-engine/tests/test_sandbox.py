import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import sandbox

TB_GOOD = '''
class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity=capacity; self.refill_rate=refill_rate
        self.tokens=capacity; self.last=now()
    def allow(self):
        t=now(); self.tokens=min(self.capacity,self.tokens+(t-self.last)*self.refill_rate); self.last=t
        if self.tokens>=1:
            self.tokens-=1; return True
        return False
'''

TB_TESTS = [
    {"name":"burst","setup":"set_time(0); b=TokenBucket(3,1)","call":"[b.allow(),b.allow(),b.allow(),b.allow()]","expected":[True,True,True,False]},
    {"name":"refill","setup":"set_time(0); b=TokenBucket(1,1); b.allow(); set_time(1)","call":"b.allow()","expected":True},
]

def test_reference_solution_passes():
    out = sandbox.run_all(TB_GOOD, TB_TESTS)
    assert out["passed"] is True
    assert out["tests_passed"] == 2

def test_starter_fails():
    out = sandbox.run_all("class TokenBucket:\n    def __init__(self,c,r): pass\n    def allow(self): return True", TB_TESTS)
    assert out["passed"] is False

def test_timeout_is_handled():
    out = sandbox.run_all("import time\n", [{"name":"loop","setup":"","call":"__import__('time').sleep(10)","expected":"x"}])
    assert out["results"][0]["passed"] is False

def test_fake_redis_available():
    tc=[{"name":"redis","setup":"redis.set('k','v')","call":"redis.get('k')","expected":"v"}]
    out=sandbox.run_all("", tc)
    assert out["passed"] is True
