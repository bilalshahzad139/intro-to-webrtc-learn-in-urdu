using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.AspNet.SignalR;

namespace WebApplication5.Models
{
    public class WebRtcHub : Hub
    {
        public void Send(string message)
        {
            Clients.Others.newMessage(message);
        }
    }
}