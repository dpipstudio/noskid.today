# NoSkid FailOver

NoSkid.today is now equipped with a failover hosting setup to improve reliability and uptime.

### What does this mean?

NoSkid.today is hosted on **two servers**:

* **Primary server**: This server hosts the full website, built directly from this repository. It serves all the normal pages and content.
* **Secondary server**: This server acts as a backup and only serves a simple fallback page ([fallback.html](../../website/errordocs/fallback.html)).

### How does it work?

If the primary server goes down or becomes unreachable for any reason, the secondary server automatically takes over by serving the fallback page. This ensures that visitors still get a response from the website, preventing downtime while we resolve any issues with the primary server.
