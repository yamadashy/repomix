let defaultTimeout = 30

class Downloader {
  var retries: Int = 3

  func download(url: String) -> Data? {
    let request = makeRequest(url)
    var attempts = 0
    return nil
  }
}

func makeRequest(_ url: String) -> Request {
  let request = Request(url: url)
  return request
}
