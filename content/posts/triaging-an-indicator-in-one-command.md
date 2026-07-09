+++
title = "Triaging a Suspicious Indicator in One Command"
date = 2026-07-08T00:00:00-07:00
draft = false
slug = "triaging-an-indicator-in-one-command"
description = "A tool I built that takes one IP, domain, hash, or URL, checks it against a stack of OSINT sources at once, and hands back a single report with a verdict and the reasons behind it. It works with no keys, and better with two free ones."
tags = ["osint", "cybersecurity", "security", "python"]

cover = ""

devto = true
+++

A lot of security work starts the same way. Something hands you an indicator: an IP
out of a firewall log, a file hash off an alert, a domain from an email that did not
feel right. Before you can do anything with it you have to answer two questions. Is
it bad, and what is it connected to?

The usual way to answer that is by hand, one tab at a time:
[VirusTotal](https://www.virustotal.com/), then [AbuseIPDB](https://www.abuseipdb.com/),
then a WHOIS lookup, then [crt.sh](https://crt.sh/), then a couple of blocklists,
holding half-loaded browser tabs in your head while you try to form an opinion. It
works, but it is slow and easy to do inconsistently, and it falls apart around the
third indicator of a busy day.

So I built a command-line tool that does that first pass in one shot. It is called
`indict`. You give it one indicator, it figures out the type, asks every source that
fits at the same time, and hands back a single report with a verdict and the reasons
under it.

<!--more-->

## What it does

Two kinds of sources feed the report. Some are free and need no account: DNS and
reverse DNS, WHOIS, [RIPEstat](https://stat.ripe.net/) for network ownership,
[certificate transparency](https://crt.sh/) for subdomains, and a set of free threat
blocklists ([FireHOL](https://iplists.firehol.org/), the
[Tor exit list](https://check.torproject.org/), Spamhaus,
[Feodo Tracker](https://feodotracker.abuse.ch/),
[URLhaus](https://urlhaus.abuse.ch/), [OpenPhish](https://openphish.com/)). Two more
need a free API key to switch on: [VirusTotal](https://www.virustotal.com/) for
multi-engine reputation and [AbuseIPDB](https://www.abuseipdb.com/) for abuse
history.

Real talk: the tool runs with no keys, but it is at its best with those two free
ones in. The nice part is that it is honest about the difference, and the blocklists
mean even the keyless run can return a real verdict, not just facts. The clearest way
to see all of that is to run the same indicator both ways.

## The same indicator, with and without keys

Here is a Tor exit node, looked up with **no keys at all**:

```
$ indict 171.25.193.25

╭───────────────────────────────────╮
│ 171.25.193.25  (ip)   SUSPICIOUS  │
╰───────────────────────────────────╯
 source      verdict      summary
 dns         unknown      reverse DNS: tor-exit-read-me.dfri.se
 whois       unknown      network SE-TORNET, org DFRI-MNT, country SE
 ripestat    unknown      AS198093 DFRI-AS, prefix 171.25.193.0/24, abuse abuse@dfri.net
 greynoise   unknown      not observed by GreyNoise
 blocklists  suspicious   listed on 1 of 4 blocklist(s): Tor exit node

Not run: abuseipdb (no key), virustotal (no key)
```

With zero keys it already reaches a `SUSPICIOUS` verdict, because the Tor exit list
is a free feed. The rows above it are facts (who owns the network, what the reverse
DNS says), and the "Not run" panel is honest about the two sources it could not check
without a key. Now the same command with a free VirusTotal and AbuseIPDB key added:

```
$ indict 171.25.193.25

╭──────────────────────────────────╮
│ 171.25.193.25  (ip)   MALICIOUS  │
╰──────────────────────────────────╯
 source      verdict      summary
 dns         unknown      reverse DNS: tor-exit-read-me.dfri.se
 whois       unknown      network SE-TORNET, org DFRI-MNT, country SE
 ripestat    unknown      AS198093 DFRI-AS, prefix 171.25.193.0/24, abuse abuse@dfri.net
 greynoise   unknown      not observed by GreyNoise
 blocklists  suspicious   listed on 1 of 4 blocklist(s): Tor exit node
 abuseipdb   malicious    abuse confidence 100/100 from 103 report(s); Tor exit node
 virustotal  malicious    15/91 engines flagged malicious, 2 suspicious

 • [malicious] abuseipdb: abuse confidence 100/100 from 103 report(s)
 • [malicious] virustotal: 15/91 engines flagged malicious, 2 suspicious
 • [suspicious] blocklists: listed on 1 of 4 blocklist(s): Tor exit node
```

Same indicator, more sources light up, and the verdict escalates to `MALICIOUS`. The
evidence panel at the bottom is the part that matters: 100/100 abuse confidence from
103 reports, 15 of 91 engines flagging it. Those are numbers you can sanity-check and
paste into a ticket, not a black box telling you to trust it.

That contrast is the whole pitch. Keyless, the tool can already confirm something is
bad. Add two free keys and it corroborates that with cross-engine reputation and
tells you how strong the signal is.

## Following the connections

Checking reputation is only half of it. The other question, "what is this connected
to," is where a report stops being a lookup. Every source drops breadcrumbs (the IPs
a domain resolves to, the subdomains in its certificates, the reverse DNS on an
address), and the tool clusters them. Here is `example.com`, keyless:

```
$ indict example.com

╭──────────────────────────────╮
│ example.com  (domain)  UNKNOWN │
╰──────────────────────────────╯
 source    verdict   summary
 dns       unknown   resolves to 4 IP(s); 2 nameservers, 1 mail host
 whois     unknown   registrar RESERVED-IANA, created 1995-08-14
 crt.sh    unknown   5 unique subdomain(s) in certificate transparency logs
 urlscan   unknown   10000 scan(s) on record; served from 9 distinct IP(s)

Correlated infrastructure
 104.20.23.154   (2)   example.com, www.example.com
 172.66.147.243  (2)   example.com, www.example.com
 162.43.120.101  (1)   example.com
 ...
```

crt.sh turned up subdomains, the tool resolved them, and it grouped everything by the
IP it lands on. So instead of a flat list of names you see the shape of the hosting:
`www.example.com` sits on the same addresses as the apex. On a benign domain that is
unremarkable, but on a real investigation this is exactly where the interesting thing
hides. The subdomain sitting alone on its own IP, away from the rest, is the one worth
a second look. The clustering does not decide that for you, it just arranges the facts
so the odd one out is visible instead of buried on line 34 of a certificate dump.

## The honest parts

A triage tool you cannot trust is worse than none, so the design leans on a few rules.

The verdict is never invented. When nothing flags an indicator and nothing clears it,
the report says `UNKNOWN`, not `CLEAN`. Absence from a blocklist is not a clean bill
of health, and plenty of malicious infrastructure is simply too new to be in any feed
yet. Keyless, the tool can confirm bad, not confirm good.

It also refuses to overreach. It will not call a whole domain malicious just because
someone hosted one bad link on it (attackers park payloads on GitHub and pastebins
all the time), so blocklist hits on a URL are matched exactly, not by domain. And file
hashes are the honest weak spot: with no key they have almost nothing to go on, which
is a limit worth stating rather than hiding.

Everything else is in service of trust. Every verdict carries its evidence so you can
audit it. Sources it could not reach are shown as "not run," never dropped quietly, so
you always know what was actually checked. It cites its sources and links out instead
of copying their data. A `--redact` flag strips WHOIS registrant names and emails
before you share a report, and `--json` and `--markdown` give you the same result for
a pipeline or a ticket.

## Where it is

`indict` is a personal project, part of moving my own work from cloud and security
fundamentals toward investigations and OSINT. It is on
[GitHub](https://github.com/rgerjeki/indict), it runs without any keys, and the
fastest way to get a feel for it is to add the two free keys and point it at
something.
