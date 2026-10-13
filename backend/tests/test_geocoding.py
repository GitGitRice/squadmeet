import io
import json

import pytest

from app.geocoding import NominatimGeocoder


class JsonResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


def response(value):
    return JsonResponse(json.dumps(value).encode())


def test_repeated_search_uses_the_cache(monkeypatch):
    requests = []

    def fake_urlopen(request, timeout):
        requests.append((request, timeout))
        return response([])

    monkeypatch.setattr("app.geocoding.urllib.request.urlopen", fake_urlopen)
    monkeypatch.setattr("app.geocoding.time.monotonic", lambda: 10.0)
    geocoder = NominatimGeocoder()

    geocoder.search("Clara-Zetkin-Park")
    geocoder.search("Clara-Zetkin-Park")

    assert len(requests) == 1
    assert requests[0][0].get_header("User-agent").startswith("SquadMeet/")


def test_different_provider_requests_are_at_least_one_second_apart(monkeypatch):
    # First request: starts at 10.0. Second request arrives at 10.25 and must wait 0.75 s.
    clock = iter([10.0, 10.0, 10.25, 11.0])
    sleeps = []
    monkeypatch.setattr("app.geocoding.time.monotonic", lambda: next(clock))
    monkeypatch.setattr("app.geocoding.time.sleep", sleeps.append)
    monkeypatch.setattr(
        "app.geocoding.urllib.request.urlopen", lambda request, timeout: response([])
    )
    geocoder = NominatimGeocoder()

    geocoder.search("Leipzig")
    geocoder.search("Plauen")

    assert sleeps == [pytest.approx(0.75)]
