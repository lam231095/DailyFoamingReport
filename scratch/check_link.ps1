$item = Get-Item "C:\Users\lam.dv2\OneDrive - Ortholite Vietnam\PROJECT LAM\DailyFoamingReport" -Force
$item | Select-Object Name, LinkType, Target | Format-List
