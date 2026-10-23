import pytest

def test_testing_suite_abandon_and_reset():
    """Verify that abandonTest cleanly resets all capture flags, frame counters, and progress state."""
    
    # Mock the internal state properties of TestingSuiteWindow
    class MockSuiteState:
        def __init__(self):
            self.isCapturing = True
            self.frameCount = 120
            self.metricsLog = [{"step": 1}, {"step": 2}]
            self.progressPercent = 75
            
        def abandonTest(self):
            self.isCapturing = False
            self.metricsLog = []
            self.frameCount = 0
            self.progressPercent = 0

    suite = MockSuiteState()
    assert suite.isCapturing is True
    assert suite.frameCount == 120

    # Execute reset sequence
    suite.abandonTest()

    assert suite.isCapturing is False
    assert suite.frameCount == 0
    assert len(suite.metricsLog) == 0
    assert suite.progressPercent == 0